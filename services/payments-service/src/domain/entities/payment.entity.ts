import {
  PAYMENT_STATUS,
  type PaymentStatus,
} from '../value-objects/payment-status.js';

export class Payment {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: string;
  description?: string;
  idempotencyKey?: string;
  callbackEventId?: string;
  callbackResult?: 'APPROVED' | 'REJECTED';
  callbackAttempts: number;
  callbackDeliveredAt?: Date;
  cancellationIdempotencyKey?: string;
  createdAt: Date;
  completedAt?: Date;

  constructor(data: Partial<Payment> = {}) {
    Object.assign(this, {
      status: PAYMENT_STATUS.PENDING,
      callbackAttempts: 0,
      createdAt: new Date(),
      ...data,
    });
  }
}
