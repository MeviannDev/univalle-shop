import { Inject, Injectable } from '@nestjs/common';
import {
  CATALOG_REPOSITORY,
  CatalogRepository,
} from '../../domain/ports/outbound/catalog.repository.js';
import { ProductId } from '../../domain/value-objects/product-id.vo.js';
import { ProductNotFoundError } from '../../domain/errors/domain.errors.js';

@Injectable()
export class GetProductUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: CatalogRepository,
  ) {}

  async execute(productId: string) {
    const id = ProductId.fromString(productId);
    const product = await this.catalogRepository.findProductById(id);

    if (!product) {
      throw new ProductNotFoundError(productId);
    }

    // Devuelve exactamente lo que Orders espera
    return product.toOrderView();
  }
}