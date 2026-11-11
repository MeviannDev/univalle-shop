import type { PageRequest } from '../../domain/ports/outbound/order-repository.port.js';
import { InvalidPaginationError } from '../errors/invalid-pagination.error.js';

export function validatePageRequest(page: PageRequest): void {
  if (
    !Number.isSafeInteger(page.page) ||
    page.page < 1 ||
    !Number.isSafeInteger(page.limit) ||
    page.limit < 1 ||
    page.limit > 100
  ) {
    throw new InvalidPaginationError();
  }
}
