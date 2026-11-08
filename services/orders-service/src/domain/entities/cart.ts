import { EmptyCartError } from '../errors/empty-cart.error.js';
import { CartId } from '../value-objects/cart-id.js';
import { Money } from '../value-objects/money.js';
import { ProductId } from '../value-objects/product-id.js';
import { Quantity } from '../value-objects/quantity.js';
import { UserId } from '../value-objects/user-id.js';
import { CartItem, type CartItemData } from './cart-item.js';

export type CartData = {
  id: CartId;
  userId: UserId;
  items: CartItemData[];
  createdAt: Date;
  updatedAt: Date;
};

export class Cart {
  private readonly itemMap = new Map<string, CartItem>();
  private updatedAtValue: Date;

  constructor(
    public readonly id: CartId,
    public readonly userId: UserId,
    items: CartItem[] = [],
    public readonly createdAt: Date = new Date(),
    updatedAt: Date = createdAt,
  ) {
    items.forEach((item) => this.itemMap.set(item.productId.value, item));
    this.updatedAtValue = new Date(updatedAt);
  }

  get items(): readonly CartItem[] {
    return [...this.itemMap.values()];
  }

  get updatedAt(): Date {
    return new Date(this.updatedAtValue);
  }

  get isEmpty(): boolean {
    return this.itemMap.size === 0;
  }

  get total(): Money {
    const first = this.items[0];
    if (!first) {
      return new Money(0, 'COP');
    }
    return this.items.slice(1).reduce((total, item) => total.add(item.subtotal), first.subtotal);
  }

  addItem(item: CartItem): void {
    const existing = this.itemMap.get(item.productId.value);
    if (existing) {
      existing.increase(item.quantity);
    } else {
      this.itemMap.set(item.productId.value, item);
    }
    this.touch();
  }

  removeItem(productId: ProductId): void {
    this.itemMap.delete(productId.value);
    this.touch();
  }

  changeQuantity(productId: ProductId, quantity: Quantity): void {
    const item = this.itemMap.get(productId.value);
    if (!item) {
      return;
    }
    item.changeQuantity(quantity);
    this.touch();
  }

  clear(): void {
    this.itemMap.clear();
    this.touch();
  }

  checkout(): readonly CartItem[] {
    if (this.isEmpty) {
      throw new EmptyCartError();
    }
    return this.items;
  }

  toData(): CartData {
    return {
      id: this.id,
      userId: this.userId,
      items: this.items.map((item) => item.toData()),
      createdAt: new Date(this.createdAt),
      updatedAt: this.updatedAt,
    };
  }

  private touch(): void {
    this.updatedAtValue = new Date();
  }
}
