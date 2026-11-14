import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Put,
} from '@nestjs/common';
import { IndexProductUseCase } from '../../application/use-cases/index-product.use-case.js';
import { RemoveIndexedProductUseCase } from '../../application/use-cases/remove-indexed-product.use-case.js';
import { SearchableProduct } from '../../domain/searchable-product.js';

@Controller('internal/search/products')
export class ProductIndexController {
  constructor(
    private readonly indexProduct: IndexProductUseCase,
    private readonly removeProduct: RemoveIndexedProductUseCase,
  ) {}

  @Put(':productId')
  async index(
    @Param('productId') productId: string,
    @Body() body: unknown,
  ): Promise<{ indexed: true }> {
    const product = this.toSearchableProduct(productId, body);
    await this.indexProduct.execute(product);
    return { indexed: true };
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('productId') productId: string): Promise<void> {
    const normalizedId = productId.trim();
    if (!normalizedId) {
      throw new BadRequestException('productId no puede estar vacío.');
    }
    await this.removeProduct.execute(normalizedId);
  }

  private toSearchableProduct(
    productId: string,
    body: unknown,
  ): SearchableProduct {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('El cuerpo debe ser un producto.');
    }

    const candidate = body as Record<string, unknown>;
    const normalizedId = productId.trim();
    if (
      !normalizedId ||
      typeof candidate.name !== 'string' ||
      !candidate.name.trim() ||
      typeof candidate.description !== 'string' ||
      typeof candidate.category !== 'string' ||
      !candidate.category.trim() ||
      typeof candidate.price !== 'number' ||
      !Number.isFinite(candidate.price) ||
      candidate.price < 0 ||
      typeof candidate.isActive !== 'boolean' ||
      (candidate.imageUrl !== undefined &&
        typeof candidate.imageUrl !== 'string')
    ) {
      throw new BadRequestException('Los datos del producto no son válidos.');
    }

    return {
      productId: normalizedId,
      name: candidate.name.trim(),
      description: candidate.description.trim(),
      category: candidate.category.trim(),
      price: candidate.price,
      ...(typeof candidate.imageUrl === 'string'
        ? { imageUrl: candidate.imageUrl }
        : {}),
      isActive: candidate.isActive,
    };
  }
}
