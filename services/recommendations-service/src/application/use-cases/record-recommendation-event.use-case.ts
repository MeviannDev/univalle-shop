import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RecommendationEvent } from '../../domain/entities/recommendation-event.entity.js';
import {
  RECOMMENDATION_REPOSITORY_PORT,
  type RecommendationRepositoryPort,
} from '../../domain/ports/recommendation.repository.js';
import { RecordRecommendationEventDto } from '../dtos/record-recommendation-event.dto.js';

@Injectable()
export class RecordRecommendationEventUseCase {
  constructor(
    @Inject(RECOMMENDATION_REPOSITORY_PORT)
    private readonly recommendationRepository: RecommendationRepositoryPort,
  ) {}

  execute(dto: RecordRecommendationEventDto): Promise<RecommendationEvent> {
    return this.recommendationRepository.saveEvent(
      new RecommendationEvent({
        id: randomUUID(),
        userId: dto.userId.trim(),
        productId: dto.productId.trim(),
        category: dto.category.trim(),
        type: dto.type,
      }),
    );
  }
}
