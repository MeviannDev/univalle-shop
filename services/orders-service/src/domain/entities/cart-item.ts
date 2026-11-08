import { Money } from '../value-objects/money.js';
import { ProductId } from '../value-objects/product-id.js';
import { Quantity } from '../value-objects/quantity.js';

export type CartItemData = {
  productId: ProductId;
  name: string;
  unitPrice: Money;
  quantity: Quantity;
};

export class CartItem {
  private quantityValue: Quantity;

  constructor(
    public readonly productId: ProductId,
    public readonly name: string,
    public readonly unitPrice: Money,
    quantity: Quantity,
  ) {
    if (!name.trim()) {
      throw new Error('El nombre del producto no puede estar vacío');
    }
    this.quantityValue = quantity;
  }

  get quantity(): Quantity {
    return this.quantityValue;
  }

  get subtotal(): Money {
    return this.unitPrice.multiply(this.quantity.value);
  }

  increase(quantity: Quantity): void {
    this.quantityValue = new Quantity(this.quantity.value + quantity.value, this.quantity.max);
  }

  changeQuantity(quantity: Quantity): void {
    this.quantityValue = quantity;
  }

  toData(): CartItemData {
    return {
      productId: this.productId,
      name: this.name,
      unitPrice: this.unitPrice,
      quantity: this.quantity,
    };
  }
}
