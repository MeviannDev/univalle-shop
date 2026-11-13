import { ExternalServiceUnavailableError } from '../../application/errors/external-service-unavailable.error.js';
import { InvalidDependencyResponseError } from '../../application/errors/invalid-dependency-response.error.js';
import { ProductUnavailableError } from '../../application/errors/product-unavailable.error.js';
import { ApplicationError } from '../../application/errors/application.error.js';
import { DomainError } from '../../domain/errors/domain.error.js';
import { ExternalHttpError } from './http-service-client.js';

export function mapExternalError(service: string, error: unknown): Error {
  if (error instanceof ApplicationError || error instanceof DomainError) {
    return error;
  }
  if (error instanceof ExternalHttpError && error.status === 404 && service === 'Catálogo') {
    return new ProductUnavailableError('desconocido');
  }
  if (error instanceof ExternalHttpError && error.status >= 400 && error.status < 500) {
    return new InvalidDependencyResponseError(service);
  }
  return new ExternalServiceUnavailableError(service, error);
}

export async function adaptCall<T>(
  service: string,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw mapExternalError(service, error);
  }
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new InvalidDependencyResponseError('externo');
  }
  return value as Record<string, unknown>;
}

export function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new InvalidDependencyResponseError(`externo (${field})`);
  }
  return value;
}

export function requiredNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new InvalidDependencyResponseError(`externo (${field})`);
  }
  return value;
}
