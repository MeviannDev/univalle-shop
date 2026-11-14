import { ApplicationError } from './application.error.js';

export class ExternalServiceUnavailableError extends ApplicationError {
  constructor(service: string, cause: unknown) {
    super(`El servicio ${service} no está disponible`, 'DEPENDENCY_UNAVAILABLE', { cause });
  }
}
