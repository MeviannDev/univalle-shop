import { DomainError } from './domain.error.js';

export class InvalidOrderStatusError extends DomainError {
  constructor(value: string) {
    super(`El estado de orden no es válido: ${value}`, 'INVALID_ORDER_STATUS');
  }
}
