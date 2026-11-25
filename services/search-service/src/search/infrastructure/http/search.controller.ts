import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SearchProductsUseCase } from '../../application/use-cases/search-products.use-case.js';
import { SearchProductsResponseDto } from './search-response.dto.js';

@Controller('search')
@ApiTags('Búsqueda')
export class SearchController {
  constructor(
    private readonly searchProducts: SearchProductsUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Buscar productos activos' })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Texto que se buscará en nombre, categoría y descripción.',
    example: 'cuaderno',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    minimum: 1,
    default: 1,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @ApiOkResponse({
    description: 'Resultados ordenados por relevancia.',
    type: SearchProductsResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'La consulta o los parámetros de paginación no son válidos.',
  })
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
