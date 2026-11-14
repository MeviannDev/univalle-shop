import { ApplicationError } from './application.error.js';

export class OrderNotFoundError extends ApplicationError {
  constructor() {
    super('La orden solicitada no existe', 'ORDER_NOT_FOUND');
  }
}
