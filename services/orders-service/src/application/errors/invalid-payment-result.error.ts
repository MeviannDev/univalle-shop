import { ApplicationError } from './application.error.js';

export class InvalidPaymentResultError extends ApplicationError {
  constructor(message = 'El resultado de pago no corresponde a la orden') {
    super(message, 'INVALID_PAYMENT_RESULT');
  }
}
