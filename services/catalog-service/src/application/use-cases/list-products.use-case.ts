import { Inject, Injectable } from '@nestjs/common';
import {
  CATALOG_REPOSITORY,
  CatalogRepository,
} from '../../domain/ports/outbound/catalog.repository.js';
import { CategoryId } from '../../domain/value-objects/category-id.vo.js';

export interface ListProductsInput {
  page?: number;
  limit?: number;
  categoryId?: string;
  availableOnly?: boolean;
}

@Injectable()
export class ListProductsUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: CatalogRepository,
  ) {}

  async execute(input: ListProductsInput = {}) {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = Math.min(input.limit && input.limit > 0 ? input.limit : 20, 100);

    const result = await this.catalogRepository.findProducts({
      page,
      limit,
      categoryId: input.categoryId
        ? CategoryId.fromString(input.categoryId)
        : undefined,
      availableOnly: input.availableOnly,
    });

    return {
      items: result.items.map((product) => ({
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
      })),
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }
}