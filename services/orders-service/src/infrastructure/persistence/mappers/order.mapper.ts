import { Order, type OrderReconstitutionData } from '../../../domain/entities/order.js';
import { OrderItem } from '../../../domain/entities/order-item.js';
import { Money } from '../../../domain/value-objects/money.js';
import { OrderId } from '../../../domain/value-objects/order-id.js';
import { ProductId } from '../../../domain/value-objects/product-id.js';
import type { OrderStatusValue } from '../../../domain/value-objects/order-status.js';
import { Quantity } from '../../../domain/value-objects/quantity.js';
import { UserId } from '../../../domain/value-objects/user-id.js';
import type { OrderSchema } from '../schemas/order.schema.js';

export class OrderMapper {
  static toDomain(document: OrderSchema & { _id: string }): Order {
    const items = document.items.map(
      (item) =>
        new OrderItem(
          new ProductId(item.productId),
          item.name,
          new Money(item.unitPrice.amount, item.unitPrice.currency),
          new Quantity(item.quantity),
        ),
    );
    const data: OrderReconstitutionData = {
      id: new OrderId(document._id),
      userId: new UserId(document.userId),
      items,
      total: new Money(document.total.amount, document.total.currency),
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      status: document.status as OrderStatusValue,
      createdBy: document.createdBy,
      statusHistory: document.statusHistory.map((entry) => ({
        from: entry.from as OrderStatusValue | null,
        to: entry.to as OrderStatusValue,
        at: entry.at,
        actor: entry.actor,
      })),
      reservationIds: document.reservationIds,
      paymentId: document.paymentId,
      processedPaymentEventIds: document.processedPaymentEventIds,
    };
    return Order.reconstitute(data);
  }

  static toPersistence(order: Order, idempotencyKey?: string): Record<string, unknown> {
    return {
      _id: order.id.value,
      userId: order.userId.value,
      status: order.status.value,
      items: order.items.map((item) => ({
        productId: item.productId.value,
        name: item.name,
        unitPrice: {
          amount: item.unitPrice.amount,
          currency: item.unitPrice.currency,
        },
        quantity: item.quantity.value,
        subtotal: { amount: item.subtotal.amount, currency: item.subtotal.currency },
      })),
      total: { amount: order.total.amount, currency: order.total.currency },
      currency: order.total.currency,
      ...(idempotencyKey ? { idempotencyKey } : {}),
      paymentId: order.paymentId,
      reservationIds: [...order.reservationIds],
      processedPaymentEventIds: [...order.processedPaymentEventIds],
      statusHistory: order.statusHistory.map((entry) => ({ ...entry })),
      createdBy: order.statusHistory[0]?.actor ?? order.userId.value,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
