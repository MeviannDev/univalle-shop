import { DomainError } from './domain.error.js';

export class InvalidIdentifierError extends DomainError {
  constructor() {
    super('El identificador no puede estar vacío', 'INVALID_IDENTIFIER');
  }
}
