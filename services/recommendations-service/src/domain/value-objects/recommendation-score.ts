export const RECOMMENDATION_SCORE = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

export type RecommendationScore = (typeof RECOMMENDATION_SCORE)[keyof typeof RECOMMENDATION_SCORE];
