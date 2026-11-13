import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReindexCatalog } from '../../../../../application/use-cases/reindex-catalog.js';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard.js';

@ApiTags('internal')
@Controller('internal')
@UseGuards(InternalApiKeyGuard)
@ApiHeader({ name: 'x-internal-api-key', required: true })
export class InternalController {
  constructor(private readonly reindexCatalog: ReindexCatalog) {}

  @Post('reindex')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reconstruye el índice leyendo todo el catálogo' })
  reindex() {
    return this.reindexCatalog.execute();
  }
}