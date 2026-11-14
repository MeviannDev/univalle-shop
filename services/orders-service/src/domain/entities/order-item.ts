import { Money } from '../value-objects/money.js';
import { ProductId } from '../value-objects/product-id.js';
import { Quantity } from '../value-objects/quantity.js';

export class OrderItem {
  public readonly subtotal: Money;

  constructor(
    public readonly productId: ProductId,
    public readonly name: string,
    public readonly unitPrice: Money,
    public readonly quantity: Quantity,
  ) {
    this.subtotal = unitPrice.multiply(quantity.value);
  }
}
