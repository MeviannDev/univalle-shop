import { ApplicationError } from './application.error.js';

export class ProductUnavailableError extends ApplicationError {
  constructor(productId: string) {
    super(`El producto ${productId} no está disponible en la cantidad solicitada`, 'PRODUCT_UNAVAILABLE');
  }
}
