import { ApplicationError } from './application.error.js';

export class InvalidPaginationError extends ApplicationError {
  constructor() {
    super('La página debe ser positiva y el límite debe estar entre 1 y 100', 'INVALID_PAGINATION');
  }
}
