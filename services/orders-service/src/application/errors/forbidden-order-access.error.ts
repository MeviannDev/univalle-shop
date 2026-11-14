import { ApplicationError } from './application.error.js';

export class ForbiddenOrderAccessError extends ApplicationError {
  constructor() {
    super('No tiene permiso para acceder a esta orden', 'ORDER_FORBIDDEN');
  }
}
