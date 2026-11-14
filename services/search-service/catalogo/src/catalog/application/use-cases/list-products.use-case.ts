import type { ProductRepository } from '../ports/product.repository.js';

export class ListProductsUseCase {
  constructor(private readonly products: ProductRepository) {}

  execute() {
    return this.products.findAll();
  }
}
