import { ApplicationError } from './application.error.js';

export class InvalidPaymentResultError extends ApplicationError {
  constructor() {
    super('El resultado de pago no corresponde a la orden', 'INVALID_PAYMENT_RESULT');
  }
}
