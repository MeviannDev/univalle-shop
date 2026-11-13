import { DomainError } from './domain.error.js';

export class InvalidUserTokenError extends DomainError {
  constructor() {
    super('El token de usuario no es válido', 'INVALID_USER_TOKEN');
  }
}
