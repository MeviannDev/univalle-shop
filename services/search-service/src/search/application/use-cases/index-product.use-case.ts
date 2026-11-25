import { ProductSearchRepository } from '../ports/product-search.repository.js';
import { SearchableProduct } from '../../domain/searchable-product.js';

export class IndexProductUseCase {
  constructor(private readonly repository: ProductSearchRepository) {}

  execute(product: SearchableProduct): Promise<void> {
    return this.repository.index(product);
  }
}
