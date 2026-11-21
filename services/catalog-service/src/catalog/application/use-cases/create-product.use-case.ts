import type { CreateProductData } from '../../domain/product.js';
import type { ProductRepository } from '../ports/product.repository.js';

export class CreateProductUseCase {
  constructor(private readonly products: ProductRepository) {}

  execute(data: CreateProductData) {
    return this.products.create(data);
  }
}
