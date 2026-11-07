import { DomainError } from './domain.error.js';

export class InvalidMoneyError extends DomainError {
  constructor(message = 'El monto debe ser un entero no negativo y la moneda debe ser válida') {
    super(message, 'INVALID_MONEY');
  }
}
