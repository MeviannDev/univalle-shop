import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GenerateRecommendationDto } from '../../../application/dtos/generate-recommendation.dto.js';
import { GenerateRecommendationsUseCase } from '../../../application/use-cases/generate-recommendations.use-case.js';

@ApiTags('Recommendations')
@Controller('recommendations')
export class RecommendationController {
  constructor(private readonly generateRecommendationsUseCase: GenerateRecommendationsUseCase) {}

  @Post('generate')
  @ApiOperation({ summary: 'Genera recomendaciones personalizadas para un usuario' })
  async generate(@Body() dto: GenerateRecommendationDto) {
    return this.generateRecommendationsUseCase.execute(dto);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Obtiene recomendaciones de un usuario' })
  async findByUserId(@Param('userId') userId: string) {
    return { userId, recommendations: [] };
  }
}
