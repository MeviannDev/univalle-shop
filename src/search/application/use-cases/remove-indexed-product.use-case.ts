import { ProductSearchRepository } from '../ports/product-search.repository.js';

export class RemoveIndexedProductUseCase {
  constructor(private readonly repository: ProductSearchRepository) {}

  execute(productId: string): Promise<void> {
    return this.repository.remove(productId);
  }
}
