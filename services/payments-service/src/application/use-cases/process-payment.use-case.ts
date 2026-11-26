import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Payment } from '../../domain/entities/payment.entity.js';
import {
  PAYMENT_REPOSITORY_PORT,
  type PaymentRepositoryPort,
} from '../../domain/ports/payment.repository.js';
import {
  InvalidPaymentIdempotencyKeyError,
  PaymentIdempotencyConflictError,
} from '../../domain/errors/payment-errors.js';
import { CreatePaymentDto } from '../dtos/create-payment.dto.js';
import { PAYMENT_STATUS } from '../../domain/value-objects/payment-status.js';

@Injectable()
export class ProcessPaymentUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY_PORT)
    private readonly paymentRepository: PaymentRepositoryPort,
  ) {}

  async execute(
    dto: CreatePaymentDto,
    idempotencyKey: string,
  ): Promise<Payment> {
    if (!dto.orderId || !dto.userId) {
      throw new Error(
        'La orden y el usuario son obligatorios para procesar el pago.',
      );
    }
    if (!idempotencyKey.trim() || idempotencyKey.length > 128) {
      throw new InvalidPaymentIdempotencyKeyError();
    }

    if (dto.amount <= 0) {
      throw new Error('El monto del pago debe ser mayor a cero.');
    }

    const existing = await this.paymentRepository.findByIdempotencyKey(
      dto.userId,
      idempotencyKey,
    );
    if (existing) {
      return this.replayOrReject(existing, dto);
    }

    const simulatedApproved =
      dto.method.toLowerCase().includes('card') ||
      dto.method.toLowerCase().includes('pse') ||
      dto.method.toLowerCase().includes('wallet');
    const simulationResult = (
      process.env.PAYMENT_SIMULATION_RESULT ?? 'auto'
    ).toLowerCase();
    if (
      !['auto', 'pending', 'approved', 'rejected'].includes(simulationResult)
    ) {
      throw new Error(
        'PAYMENT_SIMULATION_RESULT debe ser auto, pending, approved o rejected.',
      );
    }
    const status =
      dto.status ??
      (simulationResult === 'auto'
        ? simulatedApproved
          ? PAYMENT_STATUS.APPROVED
          : PAYMENT_STATUS.REJECTED
        : PAYMENT_STATUS[
            simulationResult.toUpperCase() as
              'PENDING' | 'APPROVED' | 'REJECTED'
          ]);
    const callbackEnabled = process.env.PAYMENT_CALLBACK_ENABLED === 'true';
    const callbackEventId =
      callbackEnabled &&
      (status === PAYMENT_STATUS.APPROVED || status === PAYMENT_STATUS.REJECTED)
        ? randomUUID()
        : undefined;
    const callbackResult =
      status === PAYMENT_STATUS.APPROVED
        ? 'APPROVED'
        : status === PAYMENT_STATUS.REJECTED
          ? 'REJECTED'
          : undefined;
    const payment = new Payment({
      id: `payment_${randomUUID()}`,
      orderId: dto.orderId,
      userId: dto.userId,
      amount: dto.amount,
      currency: dto.currency,
      method: dto.method,
      description: dto.description,
      idempotencyKey,
      callbackEventId,
      callbackResult: callbackEventId ? callbackResult : undefined,
      status,
      completedAt:
        status === PAYMENT_STATUS.APPROVED || status === PAYMENT_STATUS.REJECTED
          ? new Date()
          : undefined,
    });

    const saved =
      await this.paymentRepository.saveIfAbsentByIdempotencyKey(payment);
    return this.replayOrReject(saved.payment, dto);
  }

  private replayOrReject(payment: Payment, dto: CreatePaymentDto): Payment {
    if (
      payment.orderId !== dto.orderId ||
      payment.userId !== dto.userId ||
      payment.amount !== dto.amount ||
      payment.currency !== dto.currency ||
      payment.method !== dto.method
    ) {
      throw new PaymentIdempotencyConflictError();
    }
    return payment;
  }
}
