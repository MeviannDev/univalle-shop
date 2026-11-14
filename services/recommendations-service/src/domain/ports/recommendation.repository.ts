import { Recommendation } from '../entities/recommendation.entity.js';

export const RECOMMENDATION_REPOSITORY_PORT = 'RECOMMENDATION_REPOSITORY_PORT';

export interface RecommendationRepositoryPort {
  save(recommendation: Recommendation): Promise<Recommendation>;
  findByUserId(userId: string): Promise<Recommendation[]>;
  findLatestByUserId(userId: string): Promise<Recommendation[]>;
  deleteAllByUserId(userId: string): Promise<void>;
}
