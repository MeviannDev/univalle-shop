import { DomainError } from './domain.error.js';

export class InvalidExternalReferenceError extends DomainError {
  constructor(reference: string) {
    super(`La referencia externa ${reference} no puede estar vacía`, 'INVALID_EXTERNAL_REFERENCE');
  }
}
