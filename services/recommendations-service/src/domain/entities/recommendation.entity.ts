import { RECOMMENDATION_SCORE, type RecommendationScore } from '../value-objects/recommendation-score.js';

export class Recommendation {
  id: string;
  userId: string;
  productId: string;
  score: RecommendationScore;
  reason: string;
  createdAt: Date;

  constructor(data: Partial<Recommendation> = {}) {
    Object.assign(this, {
      score: RECOMMENDATION_SCORE.MEDIUM,
      createdAt: new Date(),
      ...data,
    });
  }
}
