import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { Connection, Model } from 'mongoose';
import { Order } from '../../../domain/entities/order.js';
import type {
  AdminOrderFilter,
  OrderFilter,
  OrderRepository,
  Page,
  PageRequest,
  PaymentEventInput,
  ProcessedPaymentEvent,
  SavePaymentResultOutcome,
  SaveIdempotentOrderResult,
} from '../../../domain/ports/outbound/order-repository.port.js';
import type { OrderId } from '../../../domain/value-objects/order-id.js';
import type { UserId } from '../../../domain/value-objects/user-id.js';
import { OrderMapper } from '../mappers/order.mapper.js';
import { OrderSchema } from '../schemas/order.schema.js';
import { PaymentEventSchema } from '../schemas/payment-event.schema.js';

@Injectable()
export class MongooseOrderRepository implements OrderRepository {
  constructor(
    @InjectModel(OrderSchema.name)
    private readonly orders: Model<OrderSchema>,
    @InjectModel(PaymentEventSchema.name)
    private readonly paymentEvents: Model<PaymentEventSchema>,
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async findById(id: OrderId): Promise<Order | null> {
    const document = await this.orders.findById(id.value).exec();
    return document ? OrderMapper.toDomain(document) : null;
  }

  async findByIdempotencyKey(userId: UserId, key: string): Promise<Order | null> {
    const document = await this.orders
      .findOne({ userId: userId.value, idempotencyKey: key })
      .exec();
    return document ? OrderMapper.toDomain(document) : null;
  }

  async save(order: Order): Promise<void> {
    const { _id: _ignoredId, idempotencyKey: _ignoredKey, ...data } =
      OrderMapper.toPersistence(order);
    await this.orders.updateOne(
      { _id: order.id.value },
      { $set: data },
      { upsert: true, runValidators: true },
    ).exec();
  }

  async saveIfAbsentByIdempotencyKey(
    order: Order,
    key: string,
  ): Promise<SaveIdempotentOrderResult> {
    const existing = await this.findByIdempotencyKey(order.userId, key);
    if (existing) {
      return { order: existing, created: false };
    }

    try {
      const document = await this.orders.create(
        OrderMapper.toPersistence(order, key),
      );
      return { order: OrderMapper.toDomain(document), created: true };
    } catch (error) {
      if (!this.isDuplicateKey(error)) {
        throw error;
      }
      const winner = await this.findByIdempotencyKey(order.userId, key);
      if (winner) {
        return { order: winner, created: false };
      }
      throw error;
    }
  }

  async findPaymentEvent(eventId: string): Promise<ProcessedPaymentEvent | null> {
    const event = await this.paymentEvents.findOne({ eventId }).lean().exec();
    return event
      ? {
          eventId: event.eventId,
          orderId: event.orderId,
          paymentId: event.paymentId,
          result: event.result,
        }
      : null;
  }

  async savePaymentResultOnce(
    order: Order,
    event: PaymentEventInput,
  ): Promise<SavePaymentResultOutcome> {
    const session = await this.connection.startSession();
    try {
      let saved = false;
      try {
        await session.withTransaction(async () => {
          await this.paymentEvents.create(
            [{
              ...event,
              orderId: order.id.value,
            }],
            { session },
          );

          const { _id: _ignoredId, idempotencyKey: _ignoredKey, ...data } =
            OrderMapper.toPersistence(order);
          const result = await this.orders.updateOne(
            { _id: order.id.value },
            { $set: data },
            { session, runValidators: true },
          ).exec();
          if (result.matchedCount !== 1) {
            throw new Error('La orden dejó de existir al guardar el resultado de pago');
          }
          saved = true;
        });
      } catch (error) {
        if (this.isDuplicateKey(error)) {
          const existing = await this.findPaymentEvent(event.eventId);
          if (!existing) throw error;
          return this.matchesPaymentEvent(existing, order, event)
            ? 'duplicate'
            : 'conflict';
        }
        throw error;
      }
      return saved ? 'saved' : 'conflict';
    } finally {
      await session.endSession();
    }
  }

  async listByUser(
    userId: UserId,
    filter: OrderFilter,
    page: PageRequest,
  ): Promise<Page<Order>> {
    const query = { userId: userId.value, ...(filter.status ? { status: filter.status } : {}) };
    return this.paginate(query, page);
  }

  async listAll(
    filter: AdminOrderFilter,
    page: PageRequest,
  ): Promise<Page<Order>> {
    const query = {
      ...(filter.userId ? { userId: filter.userId.value } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    };
    return this.paginate(query, page);
  }

  async claimForReconciliation(
    cutoff: Date,
    maxAttempts: number,
    limit: number,
    leaseUntil: Date,
  ): Promise<readonly Order[]> {
    const claimed: Order[] = [];
    const query = {
      $and: [
        {
          $or: [
            { status: 'PENDING_PAYMENT', updatedAt: { $lt: cutoff } },
            { 'compensation.pending': { $ne: 'NONE' } },
          ],
        },
        { 'compensation.attempts': { $lt: maxAttempts } },
        {
          $or: [
            { reconciliationLockedUntil: null },
            { reconciliationLockedUntil: { $lte: new Date() } },
          ],
        },
      ],
    };
    for (let index = 0; index < limit; index += 1) {
      const document = await this.orders.findOneAndUpdate(
        query,
        { $set: { reconciliationLockedUntil: leaseUntil } },
        { sort: { updatedAt: 1 }, new: true },
      ).exec();
      if (!document) break;
      claimed.push(OrderMapper.toDomain(document));
    }
    return claimed;
  }

  private async paginate(
    filter: Record<string, unknown>,
    page: PageRequest,
  ): Promise<Page<Order>> {
    const [documents, totalItems] = await Promise.all([
      this.orders
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page.page - 1) * page.limit)
        .limit(page.limit)
        .exec(),
      this.orders.countDocuments(filter).exec(),
    ]);
    return {
      items: documents.map((document) => OrderMapper.toDomain(document)),
      page: page.page,
      limit: page.limit,
      totalItems,
      totalPages: Math.ceil(totalItems / page.limit),
    };
  }

  private isDuplicateKey(error: unknown): error is { code: number } {
    return typeof error === 'object' && error !== null && 'code' in error &&
      (error as { code?: unknown }).code === 11000;
  }

  private matchesPaymentEvent(
    existing: ProcessedPaymentEvent,
    order: Order,
    event: PaymentEventInput,
  ): boolean {
    return (
      existing.orderId === order.id.value &&
      existing.paymentId === event.paymentId &&
      existing.result === event.result
    );
  }
}
