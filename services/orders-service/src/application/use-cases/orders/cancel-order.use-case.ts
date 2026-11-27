import type { CatalogServicePort } from '../../../domain/ports/outbound/catalog-service.port.js';
import type { OrderRepository } from '../../../domain/ports/outbound/order-repository.port.js';
import type { PaymentServicePort } from '../../../domain/ports/outbound/payment-service.port.js';
import type { UserServicePort } from '../../../domain/ports/outbound/user-service.port.js';
import { OrderId } from '../../../domain/value-objects/order-id.js';
import { OrderNotFoundError } from '../../errors/order-not-found.error.js';
import { assertOrderOwnerOrAdmin, authenticate } from '../../shared/authorization.js';
import { callExternal } from '../../shared/external-call.js';

export type CancelOrderCommand = {
  token: string;
  orderId: string;
};
export type CancelOrderResult = {
  order: NonNullable<Awaited<ReturnType<OrderRepository['findById']>>>;
};

export class CancelOrder {
  constructor(
    private readonly orders: OrderRepository,
    private readonly catalog: CatalogServicePort,
    private readonly payments: PaymentServicePort,
    private readonly users: UserServicePort,
  ) {}

  async execute(command: CancelOrderCommand): Promise<CancelOrderResult> {
    const actor = await authenticate(this.users, command.token);
    const order = await callExternal('Persistencia de órdenes', () =>
      this.orders.findById(new OrderId(command.orderId)),
    );
    if (!order) {
      throw new OrderNotFoundError();
    }
    assertOrderOwnerOrAdmin(actor, order.userId.value);
    const previousStatus = order.status.value;
    if (!order.canTransitionTo('CANCELLED')) {
      order.cancel(actor.userId.value);
    }
    if (
      previousStatus === 'PENDING_PAYMENT' ||
      previousStatus === 'PAID' ||
      previousStatus === 'PROCESSING'
    ) {
      order.markCompensationPending(
        order.paymentId ? 'REFUND_AND_RELEASE' : 'RELEASE_RESERVATIONS',
        'Compensación iniciada',
      );
      await callExternal('Persistencia de órdenes', () => this.orders.save(order));
      try {
        if (order.paymentId) {
          await callExternal('Pagos', () =>
            this.payments.cancelOrRefundPayment({
              paymentId: order.paymentId!,
              orderId: order.id,
              idempotencyKey: `cancel-${order.id.value}`,
            }),
          );
        }
        for (const reservationId of order.reservationIds) {
          await callExternal('Catálogo', () =>
            this.catalog.cancelStockReservation(reservationId),
          );
        }
      } catch (error) {
        order.markCompensationPending(
          order.paymentId ? 'REFUND_AND_RELEASE' : 'RELEASE_RESERVATIONS',
          error,
        );
        await callExternal('Persistencia de órdenes', () => this.orders.save(order));
        throw error;
      }
    }
    order.clearCompensation();
    order.cancel(actor.userId.value);
    await callExternal('Persistencia de órdenes', () => this.orders.save(order));
    return { order };
  }
}
