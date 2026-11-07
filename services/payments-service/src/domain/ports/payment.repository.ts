import { Payment } from '../entities/payment.entity.js';

export const PAYMENT_REPOSITORY_PORT = 'PAYMENT_REPOSITORY_PORT';

export interface PaymentRepositoryPort {
  save(payment: Payment): Promise<Payment>;
  findById(id: string): Promise<Payment | null>;
  findByOrderId(orderId: string): Promise<Payment | null>;
  findByUserId(userId: string): Promise<Payment[]>;
  update(payment: Payment): Promise<Payment>;
}
