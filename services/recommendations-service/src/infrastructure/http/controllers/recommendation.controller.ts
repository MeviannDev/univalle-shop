import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GenerateRecommendationDto } from '../../../application/dtos/generate-recommendation.dto.js';
import { RecordRecommendationEventDto } from '../../../application/dtos/record-recommendation-event.dto.js';
import { GenerateRecommendationsUseCase } from '../../../application/use-cases/generate-recommendations.use-case.js';
import { RecordRecommendationEventUseCase } from '../../../application/use-cases/record-recommendation-event.use-case.js';
import {
  RECOMMENDATION_REPOSITORY_PORT,
  type RecommendationRepositoryPort,
} from '../../../domain/ports/recommendation.repository.js';

@ApiTags('Recommendations')
@Controller('recommendations')
export class RecommendationController {
  constructor(
    private readonly generateRecommendationsUseCase: GenerateRecommendationsUseCase,
    private readonly recordRecommendationEventUseCase: RecordRecommendationEventUseCase,
    @Inject(RECOMMENDATION_REPOSITORY_PORT)
    private readonly recommendationRepository: RecommendationRepositoryPort,
  ) {}

  @Post('generate')
  @ApiOperation({ summary: 'Genera recomendaciones personalizadas para un usuario' })
  async generate(@Body() dto: GenerateRecommendationDto) {
    return this.generateRecommendationsUseCase.execute(dto);
  }

  @Post('events')
  @ApiOperation({ summary: 'Registra una vista o compra para personalizar recomendaciones' })
  async recordEvent(@Body() dto: RecordRecommendationEventDto) {
    return this.recordRecommendationEventUseCase.execute(dto);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Obtiene recomendaciones de un usuario' })
  async findByUserId(@Param('userId') userId: string) {
    const recommendations =
      await this.recommendationRepository.findLatestByUserId(userId);
    return { userId, recommendations };
  }
}
