import { Inject, Injectable } from '@nestjs/common';
import { Recommendation } from '../../domain/entities/recommendation.entity.js';
import { RECOMMENDATION_REPOSITORY_PORT, type RecommendationRepositoryPort } from '../../domain/ports/recommendation.repository.js';
import { GenerateRecommendationDto } from '../dtos/generate-recommendation.dto.js';

@Injectable()
export class GenerateRecommendationsUseCase {
  constructor(
    @Inject(RECOMMENDATION_REPOSITORY_PORT)
    private readonly recommendationRepository: RecommendationRepositoryPort,
  ) {}

  async execute(dto: GenerateRecommendationDto): Promise<Recommendation[]> {
    if (!dto.productIds.length) {
      throw new Error('Debe existir al menos un producto para generar recomendaciones.');
    }

    const recommendations = dto.productIds.map((productId, index) => {
      const score = index === 0 ? 'high' : index === 1 ? 'medium' : 'low';

      return new Recommendation({
        id: crypto.randomUUID(),
        userId: dto.userId,
        productId,
        score,
        reason: `Recomendado por la categoría ${dto.category} y el comportamiento del usuario.`,
      });
    });

    const savedRecommendations: Recommendation[] = [];
    for (const recommendation of recommendations) {
      savedRecommendations.push(await this.recommendationRepository.save(recommendation));
    }

    return savedRecommendations;
  }
}
