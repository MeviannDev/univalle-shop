import { ApplicationError } from './application.error.js';

export class IdempotencyKeyError extends ApplicationError {
  constructor(message = 'La clave de idempotencia es obligatoria y debe tener hasta 128 caracteres') {
    super(message, 'INVALID_IDEMPOTENCY_KEY');
  }
}
