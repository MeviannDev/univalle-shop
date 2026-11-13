import type { Money } from '../../value-objects/money.js';
import type { OrderId } from '../../value-objects/order-id.js';
import type { UserId } from '../../value-objects/user-id.js';

export const PAYMENT_SERVICE = Symbol('PAYMENT_SERVICE');

export type StartPaymentRequest = {
  orderId: OrderId;
  userId: UserId;
  amount: Money;
  idempotencyKey: string;
};

export type PaymentInitiated = {
  paymentId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
};

export type PaymentResult = {
  paymentId: string;
  orderId: OrderId;
  result: 'APPROVED' | 'REJECTED' | 'PENDING';
  eventId: string;
};

export type CancelOrRefundPaymentRequest = {
  paymentId: string;
  orderId: OrderId;
  idempotencyKey: string;
};

export interface PaymentServicePort {
  startPayment(request: StartPaymentRequest): Promise<PaymentInitiated>;
  cancelOrRefundPayment(request: CancelOrRefundPaymentRequest): Promise<void>;
}
