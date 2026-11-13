import { Inject, Injectable } from '@nestjs/common';
import {
  CATALOG_REPOSITORY,
  CatalogRepository,
} from '../../domain/ports/outbound/catalog.repository.js';
import { ProductId } from '../../domain/value-objects/product-id.vo.js';
import { ProductNotFoundError } from '../../domain/errors/domain.errors.js';

@Injectable()
export class DeleteProductUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: CatalogRepository,
  ) {}

  async execute(productId: string): Promise<void> {
    const id = ProductId.fromString(productId);
    const product = await this.catalogRepository.findProductById(id);

    if (!product) {
      throw new ProductNotFoundError(productId);
    }

    await this.catalogRepository.deleteProduct(id);
  }
}