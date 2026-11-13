import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  PaymentInitiated,
  PaymentServicePort,
  StartPaymentRequest,
} from '../../domain/ports/outbound/payment-service.port.js';

@Injectable()
export class PaymentsStubAdapter implements PaymentServicePort {
  private readonly payments = new Map<string, PaymentInitiated>();

  constructor(private readonly config: ConfigService) {}

  async startPayment(request: StartPaymentRequest): Promise<PaymentInitiated> {
    const existing = this.payments.get(request.idempotencyKey);
    if (existing) {
      return existing;
    }
    const setting = this.config.get<string>('STUB_PAYMENT_RESULT', 'PENDING');
    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(setting)) {
      throw new Error('STUB_PAYMENT_RESULT debe ser PENDING, APPROVED o REJECTED');
    }
    const status = setting as PaymentInitiated['status'];
    const payment = {
      paymentId: `stub-payment-${request.orderId.value}`,
      status,
    };
    this.payments.set(request.idempotencyKey, payment);
    return payment;
  }

  async cancelOrRefundPayment(request: {
    paymentId: string;
    orderId: StartPaymentRequest['orderId'];
    idempotencyKey: string;
  }): Promise<void> {
    if (!request.paymentId.trim() || !request.idempotencyKey.trim()) {
      throw new Error('Solicitud de cancelación de pago inválida');
    }
  }
}
