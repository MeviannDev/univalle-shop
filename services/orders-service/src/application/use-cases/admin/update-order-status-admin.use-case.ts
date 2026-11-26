import type { CatalogServicePort } from '../../../domain/ports/outbound/catalog-service.port.js';
import type { OrderRepository } from '../../../domain/ports/outbound/order-repository.port.js';
import type { PaymentServicePort } from '../../../domain/ports/outbound/payment-service.port.js';
import type { UserServicePort } from '../../../domain/ports/outbound/user-service.port.js';
import { OrderId } from '../../../domain/value-objects/order-id.js';
import type { OrderStatusValue } from '../../../domain/value-objects/order-status.js';
import { OrderNotFoundError } from '../../errors/order-not-found.error.js';
import { authorizeAdmin } from '../../shared/authorization.js';
import { callExternal } from '../../shared/external-call.js';

export type UpdateOrderStatusAdminCommand = {
  token: string;
  orderId: string;
  status: OrderStatusValue;
};
export type UpdateOrderStatusAdminResult = {
  order: NonNullable<Awaited<ReturnType<OrderRepository['findById']>>>;
};

export class UpdateOrderStatusAdmin {
  constructor(
    private readonly orders: OrderRepository,
    private readonly catalog: CatalogServicePort,
    private readonly payments: PaymentServicePort,
    private readonly users: UserServicePort,
  ) {}

  async execute(
    command: UpdateOrderStatusAdminCommand,
  ): Promise<UpdateOrderStatusAdminResult> {
    const admin = await authorizeAdmin(this.users, command.token);
    const order = await callExternal('Persistencia de órdenes', () =>
      this.orders.findById(new OrderId(command.orderId)),
    );
    if (!order) {
      throw new OrderNotFoundError();
    }
    const previousStatus = order.status.value;
    if (!order.canTransitionTo(command.status)) {
      order.transitionTo(command.status, admin.userId.value);
    }
    if (
      command.status === 'CANCELLED' &&
      order.paymentId &&
      previousStatus !== 'PAYMENT_FAILED'
    ) {
      await callExternal('Pagos', () =>
        this.payments.cancelOrRefundPayment({
          paymentId: order.paymentId!,
          orderId: order.id,
          idempotencyKey: `cancel-${order.id.value}`,
        }),
      );
    }
    if (
      command.status === 'CANCELLED' &&
      ['PENDING_PAYMENT', 'PAID', 'PROCESSING'].includes(previousStatus)
    ) {
      for (const reservationId of order.reservationIds) {
        await callExternal('Catálogo', () =>
          this.catalog.cancelStockReservation(reservationId),
        );
      }
    }
    if (command.status === 'DELIVERED') {
      for (const reservationId of order.reservationIds) {
        await callExternal('Catálogo', () =>
          this.catalog.fulfillStockReservation(reservationId),
        );
      }
    }
    order.transitionTo(command.status, admin.userId.value);
    await callExternal('Persistencia de órdenes', () => this.orders.save(order));
    return { order };
  }
}
