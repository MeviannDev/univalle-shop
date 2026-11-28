import { Module } from '@nestjs/common';
import { RecommendationController } from '../../infrastructure/http/controllers/recommendation.controller.js';
import { GenerateRecommendationsUseCase } from '../../application/use-cases/generate-recommendations.use-case.js';
import { RecordRecommendationEventUseCase } from '../../application/use-cases/record-recommendation-event.use-case.js';
import { MongoRecommendationRepository } from '../../infrastructure/persistence/repositories/mongodb-recommendation.repository.js';
import { RECOMMENDATION_REPOSITORY_PORT } from '../../domain/ports/recommendation.repository.js';

@Module({
  controllers: [RecommendationController],
  providers: [
    GenerateRecommendationsUseCase,
    RecordRecommendationEventUseCase,
    {
      provide: RECOMMENDATION_REPOSITORY_PORT,
      useClass: MongoRecommendationRepository,
    },
  ],
})
export class RecommendationModule {}
