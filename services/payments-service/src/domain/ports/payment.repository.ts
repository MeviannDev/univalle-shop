import { Payment } from '../entities/payment.entity.js';

export const PAYMENT_REPOSITORY_PORT = 'PAYMENT_REPOSITORY_PORT';

export type SavePaymentResult = {
  payment: Payment;
  created: boolean;
};

export interface PaymentRepositoryPort {
  save(payment: Payment): Promise<Payment>;
  saveIfAbsentByIdempotencyKey(payment: Payment): Promise<SavePaymentResult>;
  findById(id: string): Promise<Payment | null>;
  findByOrderId(orderId: string): Promise<Payment | null>;
  findByUserId(userId: string): Promise<Payment[]>;
  update(payment: Payment): Promise<Payment>;
  findByIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<Payment | null>;
  findUndeliveredCallbacks(
    maxAttempts: number,
    limit: number,
  ): Promise<Payment[]>;
  recordCallbackAttempt(
    paymentId: string,
    eventId: string,
    maxAttempts: number,
  ): Promise<number | null>;
  markCallbackDelivered(paymentId: string, eventId: string): Promise<void>;
  cancelOrRefund(
    paymentId: string,
    orderId: string,
    idempotencyKey: string,
  ): Promise<Payment>;
}
