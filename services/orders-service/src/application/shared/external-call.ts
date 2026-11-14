import { ExternalServiceUnavailableError } from '../errors/external-service-unavailable.error.js';
import { ApplicationError } from '../errors/application.error.js';
import { DomainError } from '../../domain/errors/domain.error.js';

export async function callExternal<T>(
  service: string,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ApplicationError || error instanceof DomainError) {
      throw error;
    }
    throw new ExternalServiceUnavailableError(service, error);
  }
}

export async function compensate(
  service: string,
  operation: () => Promise<void>,
): Promise<unknown | null> {
  try {
    await operation();
    return null;
  } catch (error) {
    if (error instanceof ApplicationError || error instanceof DomainError) {
      return error;
    }
    return new ExternalServiceUnavailableError(service, error);
  }
}
