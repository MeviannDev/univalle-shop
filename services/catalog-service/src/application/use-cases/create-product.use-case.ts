import { Inject, Injectable } from '@nestjs/common';
import {
  CATALOG_REPOSITORY,
  CatalogRepository,
} from '../../domain/ports/outbound/catalog.repository.js';
import { Product } from '../../domain/entities/product.entity.js';
import { Money } from '../../domain/value-objects/money.vo.js';
import { CategoryId } from '../../domain/value-objects/category-id.vo.js';
import { ProductKind } from '../../domain/entities/product.entity.js';

export interface CreateProductInput {
  name: string;
  unitPrice: number; // en centavos de COP
  kind?: ProductKind;
  description?: string;
  categoryId?: string;
  stock?: number; // solo para PRODUCT
}

@Injectable()
export class CreateProductUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: CatalogRepository,
  ) {}

  async execute(input: CreateProductInput) {
    const product = Product.create({
      name: input.name,
      unitPrice: Money.fromCents(input.unitPrice),
      kind: input.kind ?? 'PRODUCT',
      description: input.description,
      categoryId: input.categoryId
        ? CategoryId.fromString(input.categoryId)
        : undefined,
      stock: input.stock,
    });

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
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}