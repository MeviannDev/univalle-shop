import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MongoClient, type Collection } from 'mongodb';
import { Payment } from '../../../domain/entities/payment.entity.js';
import {
  PaymentIdempotencyConflictError,
  PaymentNotFoundError,
} from '../../../domain/errors/payment-errors.js';
import { PAYMENT_STATUS } from '../../../domain/value-objects/payment-status.js';
import {
  type PaymentRepositoryPort,
  type SavePaymentResult,
} from '../../../domain/ports/payment.repository.js';

@Injectable()
export class MongoPaymentRepository
  implements PaymentRepositoryPort, OnModuleInit, OnModuleDestroy
{
  private client: MongoClient;
  private collection: Collection<Payment>;

  async onModuleInit(): Promise<void> {
    const mongoUri =
      process.env.MONGODB_URI ?? 'mongodb://localhost:27019/univalle_payments';
    this.client = new MongoClient(mongoUri, { ignoreUndefined: true });
    await this.client.connect();
    const database = process.env.MONGODB_DATABASE
      ? this.client.db(process.env.MONGODB_DATABASE)
      : this.client.db();
    this.collection = database.collection<Payment>('payments');
    await this.collection.createIndex(
      { userId: 1, idempotencyKey: 1 },
      {
        unique: true,
        partialFilterExpression: { idempotencyKey: { $type: 'string' } },
        name: 'unique_user_payment_idempotency_key',
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.close();
  }

  async save(payment: Payment): Promise<Payment> {
    await this.collection.insertOne(payment);
    return payment;
  }

  async saveIfAbsentByIdempotencyKey(
    payment: Payment,
  ): Promise<SavePaymentResult> {
    if (!payment.idempotencyKey) {
      throw new Error('El pago debe incluir una clave de idempotencia.');
    }

    try {
      await this.collection.insertOne(payment);
      return { payment, created: true };
    } catch (error) {
      if (!this.isDuplicateKey(error)) throw error;
      const existing = await this.findByIdempotencyKey(
        payment.userId,
        payment.idempotencyKey,
      );
      if (existing) return { payment: existing, created: false };
      throw error;
    }
  }

  async findById(id: string): Promise<Payment | null> {
    return this.collection.findOne({ id });
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    return this.collection.findOne({ orderId });
  }

  async findByUserId(userId: string): Promise<Payment[]> {
    return this.collection.find({ userId }).toArray();
  }

  async update(payment: Payment): Promise<Payment> {
    await this.collection.updateOne({ id: payment.id }, { $set: payment });
    return payment;
  }

  async findByIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<Payment | null> {
    return this.collection.findOne({ userId, idempotencyKey });
  }

  async findUndeliveredCallbacks(
    maxAttempts: number,
    limit: number,
  ): Promise<Payment[]> {
    return this.collection
      .find({
        callbackEventId: { $type: 'string' },
        callbackResult: { $in: ['APPROVED', 'REJECTED'] },
        callbackDeliveredAt: { $exists: false },
        callbackAttempts: { $lt: maxAttempts },
      })
      .sort({ createdAt: 1 })
      .limit(limit)
      .toArray();
  }

  async recordCallbackAttempt(
    paymentId: string,
    eventId: string,
    maxAttempts: number,
  ): Promise<number | null> {
    const result = await this.collection.updateOne(
      {
        id: paymentId,
        callbackEventId: eventId,
        callbackDeliveredAt: { $exists: false },
        callbackAttempts: { $lt: maxAttempts },
      },
      { $inc: { callbackAttempts: 1 } },
    );
    if (result.matchedCount !== 1) return null;
    const payment = await this.findById(paymentId);
    return payment?.callbackAttempts ?? null;
  }

  async markCallbackDelivered(
    paymentId: string,
    eventId: string,
  ): Promise<void> {
    const result = await this.collection.updateOne(
      { id: paymentId, callbackEventId: eventId },
      { $set: { callbackDeliveredAt: new Date() } },
    );
    if (result.matchedCount === 1) return;

    const payment = await this.findById(paymentId);
    if (payment?.callbackEventId === eventId && payment.callbackDeliveredAt) {
      return;
    }
    throw new Error('No se pudo marcar el callback de pago como entregado.');
  }

  async cancelOrRefund(
    paymentId: string,
    orderId: string,
    idempotencyKey: string,
  ): Promise<Payment> {
    const payment = await this.collection.findOne({ id: paymentId, orderId });
    if (!payment) throw new PaymentNotFoundError();

    if (payment.cancellationIdempotencyKey) {
      if (payment.cancellationIdempotencyKey !== idempotencyKey) {
        throw new PaymentIdempotencyConflictError(
          'El pago ya fue cancelado con otra clave de idempotencia.',
        );
      }
      return payment;
    }

    const status =
      payment.status === PAYMENT_STATUS.APPROVED
        ? PAYMENT_STATUS.REFUNDED
        : payment.status === PAYMENT_STATUS.PENDING ||
            payment.status === PAYMENT_STATUS.PROCESSING
          ? PAYMENT_STATUS.CANCELLED
          : payment.status;
    const result = await this.collection.updateOne(
      {
        id: paymentId,
        orderId,
        $or: [
          { cancellationIdempotencyKey: { $exists: false } },
          { cancellationIdempotencyKey: idempotencyKey },
        ],
      },
      {
        $set: {
          status,
          cancellationIdempotencyKey: idempotencyKey,
          completedAt: payment.completedAt ?? new Date(),
        },
      },
    );
    const updated = await this.collection.findOne({ id: paymentId, orderId });
    if (!updated) throw new PaymentNotFoundError();
    if (
      result.matchedCount === 0 &&
      updated.cancellationIdempotencyKey !== idempotencyKey
    ) {
      throw new PaymentIdempotencyConflictError(
        'El pago ya fue cancelado con otra clave de idempotencia.',
      );
    }
    return updated;
  }

  private isDuplicateKey(error: unknown): error is { code: number } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    );
  }
}
