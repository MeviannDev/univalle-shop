import { Recommendation } from '../entities/recommendation.entity.js';
import { RecommendationEvent } from '../entities/recommendation-event.entity.js';

export const RECOMMENDATION_REPOSITORY_PORT = 'RECOMMENDATION_REPOSITORY_PORT';

export interface RecommendationSignals {
  categoryWeights: Record<string, number>;
  productWeights: Record<string, number>;
  productPopularity: Record<string, number>;
  purchasedProductIds: string[];
}

export interface RecommendationRepositoryPort {
  save(recommendation: Recommendation): Promise<Recommendation>;
  saveEvent(event: RecommendationEvent): Promise<RecommendationEvent>;
  getSignals(userId: string): Promise<RecommendationSignals>;
  findByUserId(userId: string): Promise<Recommendation[]>;
  findLatestByUserId(userId: string): Promise<Recommendation[]>;
  deleteAllByUserId(userId: string): Promise<void>;
}
