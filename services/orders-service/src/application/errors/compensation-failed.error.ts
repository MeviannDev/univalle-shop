import { ApplicationError } from './application.error.js';

export class CompensationFailedError extends ApplicationError {
  constructor(cause: unknown, failures: readonly unknown[]) {
    super('Falló la operación y una o más acciones de compensación también fallaron', 'CHECKOUT_COMPENSATION_FAILED', {
      cause: new AggregateError([cause, ...failures]),
    });
  }
}
