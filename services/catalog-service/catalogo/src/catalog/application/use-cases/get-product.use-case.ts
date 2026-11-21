import { ProductNotFoundError } from '../../domain/product.js';
import type { ProductRepository } from '../ports/product.repository.js';

export class GetProductUseCase {
  constructor(private readonly products: ProductRepository) {}

  async execute(id: string) {
    const product = await this.products.findById(id);
    if (!product) {
      throw new ProductNotFoundError(id);
    }
    return product;
  }
}
