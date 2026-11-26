import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import {
  PAYMENT_REPOSITORY_PORT,
  type PaymentRepositoryPort,
} from '../../domain/ports/payment.repository.js';

@Injectable()
export class PaymentCallbackDispatcher
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(PaymentCallbackDispatcher.name);
  private timer: NodeJS.Timeout | undefined;
  private isDispatching = false;
  private readonly pollIntervalMs = this.readPositiveInteger(
    'PAYMENT_CALLBACK_POLL_INTERVAL_MS',
    1000,
  );
  private readonly callbackTimeoutMs = this.readPositiveInteger(
    'PAYMENT_CALLBACK_TIMEOUT_MS',
    3000,
  );
  private readonly maxAttempts = this.readPositiveInteger(
    'PAYMENT_CALLBACK_MAX_ATTEMPTS',
    10,
  );

  constructor(
    @Inject(PAYMENT_REPOSITORY_PORT)
    private readonly payments: PaymentRepositoryPort,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.callbacksEnabled()) return;
    this.timer = setInterval(() => {
      void this.dispatchPendingCallbacks();
    }, this.pollIntervalMs);
    void this.dispatchPendingCallbacks();
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async dispatchPendingCallbacks(): Promise<void> {
    if (!this.callbacksEnabled() || this.isDispatching) {
      return;
    }

    this.isDispatching = true;
    try {
      const pending = await this.payments.findUndeliveredCallbacks(
        this.maxAttempts,
        25,
      );
      for (const payment of pending) {
        await this.dispatch(payment.id, payment.callbackEventId, payment);
      }
    } catch (error) {
      this.logger.error(
        `No se pudieron consultar callbacks pendientes: ${this.errorMessage(error)}`,
      );
    } finally {
      this.isDispatching = false;
    }
  }

  private async dispatch(
    paymentId: string,
    eventId: string | undefined,
    payment: {
      orderId: string;
      callbackResult?: 'APPROVED' | 'REJECTED';
    },
  ): Promise<void> {
    if (!eventId) return;
    let attempt: number | null = null;
    try {
      const callbackBaseUrl = process.env.ORDERS_CALLBACK_BASE_URL;
      const apiKey = process.env.INTERNAL_SERVICE_API_KEY;
      if (!callbackBaseUrl || !apiKey || Buffer.byteLength(apiKey) < 32) {
        throw new Error(
          'ORDERS_CALLBACK_BASE_URL e INTERNAL_SERVICE_API_KEY válido son requeridos.',
        );
      }
      const url = new URL(callbackBaseUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('ORDERS_CALLBACK_BASE_URL debe usar HTTP o HTTPS.');
      }
      url.pathname = `${url.pathname.replace(/\/+$/, '')}/${encodeURIComponent(payment.orderId)}/payment-result`;
      url.search = '';

      attempt = await this.payments.recordCallbackAttempt(
        paymentId,
        eventId,
        this.maxAttempts,
      );
      if (attempt === null) return;

      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        this.callbackTimeoutMs,
      );
      try {
        if (!payment.callbackResult) {
          throw new Error('El estado del pago no admite un callback final.');
        }
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            'x-internal-api-key': apiKey,
          },
          body: JSON.stringify({
            paymentId,
            result: payment.callbackResult,
            eventId,
          }),
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(
            `Orders rechazó el callback con HTTP ${response.status}.`,
          );
        }
        await this.payments.markCallbackDelivered(paymentId, eventId);
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      this.logger.warn(
        `Falló callback ${eventId} para pago ${paymentId} (intento ${attempt ?? 'no contabilizado'}): ${this.errorMessage(error)}`,
      );
    }
  }

  private readPositiveInteger(name: string, fallback: number): number {
    const raw = process.env[name];
    if (raw === undefined) return fallback;
    if (!/^\d+$/.test(raw) || Number(raw) < 1) {
      throw new Error(`${name} debe ser un entero positivo.`);
    }
    return Number(raw);
  }

  private callbacksEnabled(): boolean {
    const value = process.env.PAYMENT_CALLBACK_ENABLED;
    if (value === undefined || value === 'false') return false;
    if (value === 'true') return true;
    throw new Error('PAYMENT_CALLBACK_ENABLED debe ser true o false.');
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
