import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SearchItems } from '../../../../../application/use-cases/search-items.js';
import { SearchQueryDto } from '../dto/search-query.dto.js';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchItems: SearchItems) {}

  @Get()
  @ApiOperation({ summary: 'Busca productos y servicios por texto' })
  search(@Query() query: SearchQueryDto) {
    return this.searchItems.execute(query);
  }
}