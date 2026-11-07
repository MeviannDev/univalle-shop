import { Inject, Injectable } from '@nestjs/common';
import { Payment } from '../../domain/entities/payment.entity.js';
import { PAYMENT_REPOSITORY_PORT, type PaymentRepositoryPort } from '../../domain/ports/payment.repository.js';
import { CreatePaymentDto } from '../dtos/create-payment.dto.js';
import { PAYMENT_STATUS } from '../../domain/value-objects/payment-status.js';

@Injectable()
export class ProcessPaymentUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY_PORT)
    private readonly paymentRepository: PaymentRepositoryPort,
  ) {}

  async execute(dto: CreatePaymentDto): Promise<Payment> {
    if (!dto.orderId || !dto.userId) {
      throw new Error('La orden y el usuario son obligatorios para procesar el pago.');
    }

    if (dto.amount <= 0) {
      throw new Error('El monto del pago debe ser mayor a cero.');
    }

    const simulatedApproved = dto.method.toLowerCase().includes('card') || dto.method.toLowerCase().includes('pse') || dto.method.toLowerCase().includes('wallet');

    const payment = new Payment({
      id: crypto.randomUUID(),
      orderId: dto.orderId,
      userId: dto.userId,
      amount: dto.amount,
      currency: dto.currency,
      method: dto.method,
      description: dto.description,
      status: dto.status ?? (simulatedApproved ? PAYMENT_STATUS.APPROVED : PAYMENT_STATUS.REJECTED),
      completedAt: simulatedApproved ? new Date() : undefined,
    });

    return this.paymentRepository.save(payment);
  }
}
