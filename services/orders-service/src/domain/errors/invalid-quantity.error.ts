import { DomainError } from './domain.error.js';

export class InvalidQuantityError extends DomainError {
  constructor(value: number, max: number) {
    super(`La cantidad debe ser un entero entre 1 y ${max}; recibida: ${value}`, 'CART_INVALID_QUANTITY');
  }
}
