import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type {
  OrderRepository,
} from '../../../domain/ports/outbound/order-repository.port.js';
import type {
  CatalogServicePort,
} from '../../../domain/ports/outbound/catalog-service.port.js';
import type {
  PaymentServicePort,
} from '../../../domain/ports/outbound/payment-service.port.js';

export type ReconciliationResult = {
  candidates: number;
  resolved: number;
  failed: number;
};

@Injectable()
export class ReconcilePendingOrders
  implements OnModuleInit, OnModuleDestroy
{
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private readonly logger = new Logger(ReconcilePendingOrders.name);

  constructor(
    private readonly orders: OrderRepository,
    private readonly catalog: CatalogServicePort,
    private readonly payments: PaymentServicePort,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    if (this.config.get('NODE_ENV') === 'test') return;
    const intervalMs = this.positiveInteger('ORDERS_RECONCILIATION_INTERVAL_MS', 30_000);
    this.timer = setInterval(() => {
      void this.execute();
    }, intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async execute(): Promise<ReconciliationResult> {
    if (this.running) {
      return { candidates: 0, resolved: 0, failed: 0 };
    }
    this.running = true;
    const requestId = `reconcile-${randomUUID()}`;
    try {
      const ageMs = this.positiveInteger('ORDERS_RECONCILIATION_PENDING_AGE_MS', 300_000);
      const maxAttempts = this.positiveInteger('ORDERS_RECONCILIATION_MAX_ATTEMPTS', 10);
      const limit = this.positiveInteger('ORDERS_RECONCILIATION_LIMIT', 50);
      const cutoff = new Date(Date.now() - ageMs);
      const leaseMs = this.positiveInteger('ORDERS_RECONCILIATION_LEASE_MS', 60_000);
      const candidates = await this.orders.claimForReconciliation(
        cutoff,
        maxAttempts,
        limit,
        new Date(Date.now() + leaseMs),
      );
      let resolved = 0;
      let failed = 0;
      for (const order of candidates) {
        try {
          await this.reconcileOrder(order, maxAttempts);
          resolved += 1;
        } catch (error) {
          failed += 1;
          const pending = order.compensation.pending;
          order.markCompensationPending(
            pending === 'NONE' ? 'RELEASE_RESERVATIONS' : pending,
            error,
          );
          order.unlockReconciliation();
          await this.orders.save(order);
          this.logger.error(JSON.stringify({
            event: 'orders.reconciliation_failed',
            requestId,
            orderId: order.id.value,
            attempts: order.compensation.attempts,
            error: error instanceof Error ? error.message : String(error),
          }));
        }
      }
      this.logger.log(JSON.stringify({
        event: 'orders.reconciliation_completed',
        requestId,
        candidates: candidates.length,
        resolved,
        failed,
      }));
      return { candidates: candidates.length, resolved, failed };
    } finally {
      this.running = false;
    }
  }

  private async reconcileOrder(
    order: NonNullable<Awaited<ReturnType<OrderRepository['findById']>>>,
    maxAttempts: number,
  ): Promise<void> {
    if (order.compensation.attempts >= maxAttempts) return;

    if (order.compensation.pending === 'REFUND_AND_RELEASE') {
      if (order.paymentId) {
        await this.payments.cancelOrRefundPayment({
          paymentId: order.paymentId,
          orderId: order.id,
          idempotencyKey: `cancel-${order.id.value}`,
        });
      }
      await this.releaseReservations(order);
      if (order.canTransitionTo('CANCELLED')) order.cancel('reconciler');
      order.clearCompensation();
      order.unlockReconciliation();
      await this.orders.save(order);
      return;
    }

    if (order.compensation.pending === 'COMMIT_RESERVATIONS') {
      await this.commitReservations(order);
      if (order.canTransitionTo('PAID')) order.markAsPaid('reconciler');
      order.clearCompensation();
      order.unlockReconciliation();
      await this.orders.save(order);
      return;
    }

    if (order.compensation.pending === 'RELEASE_RESERVATIONS') {
      await this.releaseReservations(order);
      if (order.status.value === 'PENDING_PAYMENT' && order.canTransitionTo('CANCELLED')) {
        order.cancel('reconciler');
      }
      order.clearCompensation();
      order.unlockReconciliation();
      await this.orders.save(order);
      return;
    }

    if (order.status.value !== 'PENDING_PAYMENT') {
      order.clearCompensation();
      order.unlockReconciliation();
      await this.orders.save(order);
      return;
    }

    if (!order.paymentId) {
      await this.releaseReservations(order);
      if (order.canTransitionTo('CANCELLED')) order.cancel('reconciler');
      order.clearCompensation();
      order.unlockReconciliation();
      await this.orders.save(order);
      return;
    }

    const payment = await this.payments.getPayment(order.paymentId);
    if (payment?.status === 'APPROVED') {
      await this.commitReservations(order);
      if (order.canTransitionTo('PAID')) order.markAsPaid('reconciler');
    } else {
      await this.releaseReservations(order);
      if (order.canTransitionTo('CANCELLED')) order.cancel('reconciler');
    }
    order.clearCompensation();
    order.unlockReconciliation();
    await this.orders.save(order);
  }

  private async releaseReservations(order: NonNullable<Awaited<ReturnType<OrderRepository['findById']>>>) {
    for (const reservationId of order.reservationIds) {
      await this.catalog.cancelStockReservation(reservationId);
    }
  }

  private async commitReservations(order: NonNullable<Awaited<ReturnType<OrderRepository['findById']>>>) {
    for (const reservationId of order.reservationIds) {
      await this.catalog.commitStock(reservationId);
    }
  }

  private positiveInteger(name: string, fallback: number): number {
    const value = this.config.get<string | number>(name);
    if (value === undefined) return fallback;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
