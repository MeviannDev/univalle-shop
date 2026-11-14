import { ApplicationError } from './application.error.js';

export class CartItemNotFoundError extends ApplicationError {
  constructor() {
    super('El producto no existe en el carrito', 'CART_ITEM_NOT_FOUND');
  }
}
