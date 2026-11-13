import { ApplicationError } from './application.error.js';

export class InvalidDependencyResponseError extends ApplicationError {
  constructor(service: string) {
    super(`El servicio ${service} devolvió una respuesta inválida`, 'DEPENDENCY_INVALID_RESPONSE');
  }
}
