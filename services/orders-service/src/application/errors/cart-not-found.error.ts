import { ApplicationError } from './application.error.js';

export class CartNotFoundError extends ApplicationError {
  constructor() {
    super('El carrito activo no existe', 'CART_NOT_FOUND');
  }
}
