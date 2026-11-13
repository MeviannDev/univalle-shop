import { Inject, Injectable } from '@nestjs/common';
import {
  CATALOG_REPOSITORY,
  CatalogRepository,
} from '../../domain/ports/outbound/catalog.repository.js';
import { ProductId } from '../../domain/value-objects/product-id.vo.js';
import { Money } from '../../domain/value-objects/money.vo.js';
import { ProductNotFoundError } from '../../domain/errors/domain.errors.js';

export interface UpdateProductInput {
  name?: string;
  unitPrice?: number; // en centavos de COP
  description?: string;
  available?: boolean;
}

@Injectable()
export class UpdateProductUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: CatalogRepository,
  ) {}

  async execute(productId: string, input: UpdateProductInput) {
    const id = ProductId.fromString(productId);
    const product = await this.catalogRepository.findProductById(id);

    if (!product) {
      throw new ProductNotFoundError(productId);
    }

    if (input.unitPrice !== undefined) {
      product.updatePrice(Money.fromCents(input.unitPrice));
    }

    if (input.available === true) {
      product.activate();
    } else if (input.available === false) {
      product.deactivate();
    }

    await this.catalogRepository.saveProduct(product);

    return {
      id: product.id.getValue(),
      name: product.name,
      description: product.description,
      unitPrice: product.unitPrice.getCents(),
      kind: product.kind,
      categoryId: product.categoryId?.getValue(),
      stock: product.stock?.getAvailable() ?? null,
      available: product.available,
      updatedAt: product.updatedAt,
    };
  }
}