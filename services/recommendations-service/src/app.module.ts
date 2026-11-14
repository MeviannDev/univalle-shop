import { Module } from '@nestjs/common';
import { RecommendationModule } from './modules/recommendations/recommendation.module.js';

@Module({
  imports: [RecommendationModule],
})
export class AppModule {}
