import { ProductNotFoundError } from '../../domain/product.js';
import type { ProductRepository } from '../ports/product.repository.js';

export class DeleteProductUseCase {
  constructor(private readonly products: ProductRepository) {}

  async execute(id: string): Promise<void> {
    const deleted = await this.products.delete(id);
    if (!deleted) {
      throw new ProductNotFoundError(id);
    }
  }
}
