import { ApplicationError } from './application.error.js';

export class InvalidOrderFilterError extends ApplicationError {
  constructor() {
    super('El filtro de estado no es válido', 'INVALID_ORDER_FILTER');
  }
}
