import { Inject, Injectable } from '@nestjs/common';
import {
  PAYMENT_REPOSITORY_PORT,
  type PaymentRepositoryPort,
} from '../../domain/ports/payment.repository.js';
import { InvalidPaymentIdempotencyKeyError } from '../../domain/errors/payment-errors.js';

@Injectable()
export class CancelPaymentUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY_PORT)
    private readonly paymentRepository: PaymentRepositoryPort,
  ) {}

  execute(paymentId: string, orderId: string, idempotencyKey: string) {
    if (!idempotencyKey.trim() || idempotencyKey.length > 128) {
      throw new InvalidPaymentIdempotencyKeyError();
    }
    return this.paymentRepository.cancelOrRefund(
      paymentId,
      orderId,
      idempotencyKey,
    );
  }
}
