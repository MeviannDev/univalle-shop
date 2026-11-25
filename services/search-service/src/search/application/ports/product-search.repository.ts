import { SearchableProduct } from '../../domain/searchable-product.js';

export const PRODUCT_SEARCH_REPOSITORY = Symbol(
  'PRODUCT_SEARCH_REPOSITORY',
);

export interface ProductSearchRepository {
  search(
    query: string,
    skip: number,
    limit: number,
  ): Promise<{ items: SearchableProduct[]; total: number }>;
  index(product: SearchableProduct): Promise<void>;
  remove(productId: string): Promise<void>;
}
