import type { SearchableItem } from '../../domain/entities/searchable-item.js';
import type { SearchIndexRepository } from '../../domain/ports/search-index.repository.js';
import { type RawSearchQuery, SearchQuery } from '../../domain/value-objects/search-query.js';

export interface SearchItemsResult {
  data: SearchableItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class SearchItems {
  constructor(private readonly index: SearchIndexRepository) {}

  async execute(raw: RawSearchQuery): Promise<SearchItemsResult> {
    const query = SearchQuery.from(raw);
    const { items, total } = await this.index.search(query);
    return {
      data: items,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}