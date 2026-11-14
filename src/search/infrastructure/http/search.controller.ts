import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { SearchProductsUseCase } from '../../application/use-cases/search-products.use-case.js';

@Controller('search')
export class SearchController {
  constructor(
    private readonly searchProducts: SearchProductsUseCase,
  ) {}

  @Get()
  search(
    @Query('q') query: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const normalizedQuery = query?.trim();
    if (!normalizedQuery || normalizedQuery.length > 200) {
      throw new BadRequestException(
        'El parámetro q es obligatorio y debe tener máximo 200 caracteres.',
      );
    }
    if (page < 1 || limit < 1 || limit > 100) {
      throw new BadRequestException(
        'page debe ser mayor que 0 y limit debe estar entre 1 y 100.',
      );
    }

    return this.searchProducts.execute({
      query: normalizedQuery,
      page,
      limit,
    });
  }
}
