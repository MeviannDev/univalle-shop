import { InvalidOrderStatusError } from '../errors/invalid-order-status.error.js';

export const ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'PAYMENT_FAILED',
] as const;

export type OrderStatusValue = (typeof ORDER_STATUSES)[number];

export class OrderStatus {
  private constructor(public readonly value: OrderStatusValue) {}

  static from(value: OrderStatusValue): OrderStatus {
    if (!(ORDER_STATUSES as readonly string[]).includes(value)) {
      throw new InvalidOrderStatusError(String(value));
    }
    return new OrderStatus(value);
  }

  equals(other: OrderStatus): boolean {
    return this.value === other.value;
  }
}
