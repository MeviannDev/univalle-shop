import { ApplicationError } from './application.error.js';

export class ForbiddenAccessError extends ApplicationError {
  constructor() {
    super('No tiene permiso para realizar esta operación', 'FORBIDDEN');
  }
}
