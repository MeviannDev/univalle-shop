import { Injectable } from '@nestjs/common';
import type {
  PaymentInitiated,
  PaymentServicePort,
  StartPaymentRequest,
} from '../../domain/ports/outbound/payment-service.port.js';
import { InvalidDependencyResponseError } from '../../application/errors/invalid-dependency-response.error.js';
import {
  adaptCall,
  asRecord,
  requiredString,
} from './external-error.mapper.js';
import { HttpServiceClient } from './http-service-client.js';

@Injectable()
export class PaymentsHttpAdapter implements PaymentServicePort {
  constructor(private readonly http: HttpServiceClient) {}

  async startPayment(request: StartPaymentRequest): Promise<PaymentInitiated> {
    return adaptCall('Pagos', async () => {
      const body = asRecord(
        await this.http.request('payments', '/payments/simulate', {
          method: 'POST',
          idempotent: true,
          internal: true,
          idempotencyKey: request.idempotencyKey,
          body: {
            orderId: request.orderId.value,
            userId: request.userId.value,
            amount: request.amount.amount,
            currency: request.amount.currency,
            method: 'card',
          },
        }),
      );
      const rawStatus = requiredString(body.status, 'status').toLowerCase();
      const status =
        rawStatus === 'approved'
          ? 'APPROVED'
          : rawStatus === 'rejected'
            ? 'REJECTED'
            : rawStatus === 'pending' || rawStatus === 'processing'
              ? 'PENDING'
              : null;
      if (!status) {
        throw new InvalidDependencyResponseError('Pagos');
      }
      return {
        paymentId: requiredString(body.id, 'id'),
        status: status as PaymentInitiated['status'],
      };
    });
  }

  async cancelOrRefundPayment(request: {
    paymentId: string;
    orderId: StartPaymentRequest['orderId'];
    idempotencyKey: string;
  }): Promise<void> {
    await adaptCall('Pagos', () =>
      this.http.request(
        'payments',
        `/payments/${encodeURIComponent(request.paymentId)}/cancel`,
        {
          method: 'POST',
          idempotent: true,
          internal: true,
          idempotencyKey: request.idempotencyKey,
          body: {
            orderId: request.orderId.value,
          },
        },
      ),
    );
  }
}
