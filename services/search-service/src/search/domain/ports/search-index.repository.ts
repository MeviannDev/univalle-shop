import type { SearchableItem } from '../entities/searchable-item.js';
import type { SearchQuery } from '../value-objects/search-query.js';

export const SEARCH_INDEX_REPOSITORY = Symbol('SEARCH_INDEX_REPOSITORY');

export interface SearchResultPage {
  items: SearchableItem[];
  total: number;
}

export interface SearchIndexRepository {
  /** Busca por texto (más relevantes primero) aplicando los filtros de la consulta. */
  search(query: SearchQuery): Promise<SearchResultPage>;
  /** Deja el índice exactamente igual a `items`: agrega/actualiza los nuevos y borra los que ya no están. */
  replaceAll(items: SearchableItem[]): Promise<void>;
}