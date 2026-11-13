import { ValidationError } from '../errors/domain-error.js';
import type { ItemKind } from '../entities/searchable-item.js';

export interface RawSearchQuery {
  q?: string;
  kind?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export class SearchQuery {
  private constructor(
    readonly text: string,
    readonly kind: ItemKind | undefined,
    readonly category: string | undefined,
    readonly page: number,
    readonly limit: number,
  ) {}

  static from(raw: RawSearchQuery): SearchQuery {
    const text = (raw.q ?? '').trim();
    if (text.length < 1 || text.length > 100) {
      throw new ValidationError('q debe tener entre 1 y 100 caracteres');
    }
    if (raw.kind !== undefined && raw.kind !== 'PRODUCT' && raw.kind !== 'SERVICE') {
      throw new ValidationError('kind debe ser PRODUCT o SERVICE');
    }
    const page = raw.page ?? 1;
    const limit = raw.limit ?? 20;
    if (!Number.isInteger(page) || page < 1) {
      throw new ValidationError('page debe ser un entero mayor o igual a 1');
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      throw new ValidationError('limit debe estar entre 1 y 50');
    }
    return new SearchQuery(
      text,
      raw.kind as ItemKind | undefined,
      raw.category?.trim().toLowerCase() || undefined,
      page,
      limit,
    );
  }
}