import { Cart } from '../../../domain/entities/cart.js';
import { CartItem } from '../../../domain/entities/cart-item.js';
import { CartId } from '../../../domain/value-objects/cart-id.js';
import { Money } from '../../../domain/value-objects/money.js';
import { ProductId } from '../../../domain/value-objects/product-id.js';
import { Quantity } from '../../../domain/value-objects/quantity.js';
import { UserId } from '../../../domain/value-objects/user-id.js';
import type { CartSchema } from '../schemas/cart.schema.js';

export class CartMapper {
  static toDomain(document: CartSchema & { _id: string }): Cart {
    return new Cart(
      new CartId(document._id),
      new UserId(document.userId),
      document.items.map(
        (item) =>
          new CartItem(
            new ProductId(item.productId),
            item.name,
            new Money(item.unitPrice.amount, item.unitPrice.currency),
            new Quantity(item.quantity),
          ),
      ),
      document.createdAt,
      document.updatedAt,
    );
  }

  static toPersistence(cart: Cart): Record<string, unknown> {
    return {
      _id: cart.id.value,
      userId: cart.userId.value,
      items: cart.items.map((item) => ({
        productId: item.productId.value,
        name: item.name,
        unitPrice: {
          amount: item.unitPrice.amount,
          currency: item.unitPrice.currency,
        },
        quantity: item.quantity.value,
      })),
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }
}
