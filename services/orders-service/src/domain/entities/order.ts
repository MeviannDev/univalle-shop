import { InvalidOrderTransitionError } from '../errors/invalid-order-transition.error.js';
import { OrderId } from '../value-objects/order-id.js';
import { OrderStatus, type OrderStatusValue } from '../value-objects/order-status.js';
import { UserId } from '../value-objects/user-id.js';
import { Money } from '../value-objects/money.js';
import { Cart } from './cart.js';
import { OrderItem } from './order-item.js';

type StatusHistoryEntry = {
  from: OrderStatusValue | null;
  to: OrderStatusValue;
  at: Date;
  actor: string;
};

const transitions: Record<OrderStatusValue, readonly OrderStatusValue[]> = {
  PENDING_PAYMENT: ['PAID', 'PAYMENT_FAILED', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  PAYMENT_FAILED: ['CANCELLED'],
};

export class Order {
  private statusValue: OrderStatus;
  private updatedAtValue: Date;
  private readonly history: StatusHistoryEntry[];

  private constructor(
    public readonly id: OrderId,
    public readonly userId: UserId,
    public readonly items: readonly OrderItem[],
    public readonly total: Money,
    createdAt: Date,
    status: OrderStatusValue,
    private readonly createdBy: string,
    history?: StatusHistoryEntry[],
  ) {
    this.createdAt = new Date(createdAt);
    this.updatedAtValue = new Date(createdAt);
    this.statusValue = OrderStatus.from(status);
    this.history = history?.map((entry) => ({ ...entry, at: new Date(entry.at) })) ?? [
      { from: null, to: status, at: new Date(createdAt), actor: createdBy },
    ];
  }

  public readonly createdAt: Date;

  static createFromCart(
    id: OrderId,
    cart: Cart,
    now: Date = new Date(),
    actor = cart.userId.value,
  ): Order {
    const cartItems = cart.checkout();
    const items = cartItems.map(
      (item) => new OrderItem(item.productId, item.name, item.unitPrice, item.quantity),
    );
    const total = items.slice(1).reduce((sum, item) => sum.add(item.subtotal), items[0]!.subtotal);
    return new Order(id, cart.userId, items, total, now, 'PENDING_PAYMENT', actor);
  }

  get status(): OrderStatus {
    return this.statusValue;
  }

  get updatedAt(): Date {
    return new Date(this.updatedAtValue);
  }

  get statusHistory(): readonly StatusHistoryEntry[] {
    return this.history.map((entry) => ({ ...entry, at: new Date(entry.at) }));
  }

  markAsPaid(actor = 'payment-service'): void {
    this.transitionTo('PAID', actor);
  }

  markPaymentFailed(actor = 'payment-service'): void {
    this.transitionTo('PAYMENT_FAILED', actor);
  }

  startProcessing(actor = 'orders-service'): void {
    this.transitionTo('PROCESSING', actor);
  }

  ship(actor = 'admin'): void {
    this.transitionTo('SHIPPED', actor);
  }

  deliver(actor = 'admin'): void {
    this.transitionTo('DELIVERED', actor);
  }

  cancel(actor = 'user'): void {
    this.transitionTo('CANCELLED', actor);
  }

  transitionTo(status: OrderStatusValue, actor: string): void {
    if (!transitions[this.statusValue.value].includes(status)) {
      throw new InvalidOrderTransitionError(this.statusValue.value, status);
    }
    const now = new Date();
    this.history.push({
      from: this.statusValue.value,
      to: status,
      at: now,
      actor,
    });
    this.statusValue = OrderStatus.from(status);
    this.updatedAtValue = now;
  }
}
