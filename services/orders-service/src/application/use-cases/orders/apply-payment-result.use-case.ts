import type { CatalogServicePort } from '../../../domain/ports/outbound/catalog-service.port.js';
import type { OrderRepository } from '../../../domain/ports/outbound/order-repository.port.js';
import type { PaymentServicePort } from '../../../domain/ports/outbound/payment-service.port.js';
import type { PaymentResult } from '../../../domain/ports/outbound/payment-service.port.js';
import { InvalidOrderTransitionError } from '../../../domain/errors/invalid-order-transition.error.js';
import { OrderId } from '../../../domain/value-objects/order-id.js';
import { InvalidPaymentResultError } from '../../errors/invalid-payment-result.error.js';
import { OrderNotFoundError } from '../../errors/order-not-found.error.js';
import { callExternal } from '../../shared/external-call.js';

export type ApplyPaymentResultCommand = { result: PaymentResult };
export type ApplyPaymentResultOutput = {
  order: NonNullable<Awaited<ReturnType<OrderRepository['findById']>>>;
  duplicate: boolean;
};

export class ApplyPaymentResult {
  constructor(
    private readonly orders: OrderRepository,
    private readonly catalog: CatalogServicePort,
    private readonly payments: PaymentServicePort,
  ) {}

  async execute(command: ApplyPaymentResultCommand): Promise<ApplyPaymentResultOutput> {
    const { result } = command;
    if (!result.eventId.trim() || !result.paymentId.trim()) {
      throw new InvalidPaymentResultError();
    }
    const order = await callExternal('Persistencia de órdenes', () =>
      this.orders.findById(new OrderId(result.orderId.value)),
    );
    if (!order) {
      throw new OrderNotFoundError();
    }
    if (order.paymentId && order.paymentId !== result.paymentId) {
      throw new InvalidPaymentResultError();
    }
    if (!order.paymentId) {
      if (
        !['PENDING_PAYMENT', 'CANCELLED', 'PAYMENT_FAILED'].includes(
          order.status.value,
        )
      ) {
        throw new InvalidPaymentResultError(
          'No se puede asociar un pago a la orden en su estado actual.',
        );
      }
      order.setPaymentId(result.paymentId);
    }
    const existingEvent = await callExternal('Persistencia de órdenes', () =>
      this.orders.findPaymentEvent(result.eventId),
    );
    if (existingEvent) {
      if (
        existingEvent.orderId !== result.orderId.value ||
        existingEvent.paymentId !== result.paymentId ||
        existingEvent.result !== result.result
      ) {
        throw new InvalidPaymentResultError(
          'El evento de pago ya fue registrado con otros datos.',
        );
      }
      return { order, duplicate: true };
    }
    if (order.hasProcessedPaymentEvent(result.eventId)) {
      return { order, duplicate: true };
    }

    if (
      result.result === 'APPROVED' &&
      ['CANCELLED', 'PAYMENT_FAILED'].includes(order.status.value)
    ) {
      await callExternal('Pagos', () =>
        this.payments.cancelOrRefundPayment({
          paymentId: result.paymentId,
          orderId: order.id,
          idempotencyKey: `cancel-${order.id.value}`,
        }),
      );
      for (const reservationId of order.reservationIds) {
        await callExternal('Catálogo', () =>
          this.catalog.cancelStockReservation(reservationId),
        );
      }
      order.recordPaymentEvent(result.eventId);
      const saved = await callExternal('Persistencia de órdenes', () =>
        this.orders.savePaymentResultOnce(order, result),
      );
      if (saved === 'conflict') {
        throw new InvalidPaymentResultError(
          'El evento de pago ya fue registrado con otros datos.',
        );
      }
      return { order, duplicate: saved === 'duplicate' };
    }

    const alreadySettled =
      (result.result === 'APPROVED' &&
        ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status.value)) ||
      (result.result === 'REJECTED' &&
        ['PAYMENT_FAILED', 'CANCELLED'].includes(order.status.value)) ||
      (result.result === 'PENDING' && order.status.value !== 'PENDING_PAYMENT');
    if (alreadySettled) {
      order.recordPaymentEvent(result.eventId);
      const saved = await callExternal('Persistencia de órdenes', () =>
        this.orders.savePaymentResultOnce(order, result),
      );
      if (saved === 'conflict') {
        throw new InvalidPaymentResultError(
          'El evento de pago ya fue registrado con otros datos.',
        );
      }
      return { order, duplicate: true };
    }

    if (result.result === 'APPROVED') {
      if (!order.canTransitionTo('PAID')) {
        throw new InvalidOrderTransitionError(order.status.value, 'PAID');
      }
      for (const reservationId of order.reservationIds) {
        await callExternal('Catálogo', () =>
          this.catalog.commitStock(reservationId),
        );
      }
      order.markAsPaid();
    } else if (result.result === 'REJECTED') {
      if (!order.canTransitionTo('PAYMENT_FAILED')) {
        throw new InvalidOrderTransitionError(order.status.value, 'PAYMENT_FAILED');
      }
      for (const reservationId of order.reservationIds) {
        await callExternal('Catálogo', () =>
          this.catalog.releaseStock(reservationId),
        );
      }
      order.markPaymentFailed();
    }
    order.recordPaymentEvent(result.eventId);
    const saved = await callExternal('Persistencia de órdenes', () =>
      this.orders.savePaymentResultOnce(order, result),
    );
    if (saved === 'conflict') {
      throw new InvalidPaymentResultError(
        'El evento de pago ya fue registrado con otros datos.',
      );
    }
    return { order, duplicate: saved === 'duplicate' };
  }
}
