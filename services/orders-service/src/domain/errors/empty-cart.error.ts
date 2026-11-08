import { DomainError } from './domain.error.js';

export class EmptyCartError extends DomainError {
  constructor() {
    super('No se puede crear una orden con un carrito vacío', 'CART_EMPTY');
  }
}
