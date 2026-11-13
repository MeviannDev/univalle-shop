import { ApplicationError } from './application.error.js';

export class UnauthorizedError extends ApplicationError {
  constructor() {
    super('La identidad no pudo ser validada', 'UNAUTHORIZED');
  }
}
