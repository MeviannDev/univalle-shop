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
        await this.http.request('payments', '/api/payments', {
          method: 'POST',
          idempotent: true,
          body: {
            orderId: request.orderId.value,
            userId: request.userId.value,
            amount: {
              amount: request.amount.amount,
              currency: request.amount.currency,
            },
            idempotencyKey: request.idempotencyKey,
          },
        }),
      );
      const status = requiredString(body.status, 'status');
      if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
        throw new InvalidDependencyResponseError('Pagos');
      }
      return {
        paymentId: requiredString(body.paymentId, 'paymentId'),
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
        `/api/payments/${encodeURIComponent(request.paymentId)}/cancel`,
        {
          method: 'POST',
          idempotent: true,
          body: {
            orderId: request.orderId.value,
            idempotencyKey: request.idempotencyKey,
          },
        },
      ),
    );
  }
}
