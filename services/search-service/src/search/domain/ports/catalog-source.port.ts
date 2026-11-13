import type { SearchableItem } from '../entities/searchable-item.js';

export const CATALOG_SOURCE = Symbol('CATALOG_SOURCE');

export interface CatalogSource {
  /** Trae todos los ítems activos del catálogo. Lanza CatalogUnavailableError si falla. */
  fetchAll(): Promise<SearchableItem[]>;
}