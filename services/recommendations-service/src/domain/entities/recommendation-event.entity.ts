export const RECOMMENDATION_EVENT_TYPE = {
  VIEW: 'view',
  PURCHASE: 'purchase',
} as const;

export type RecommendationEventType =
  (typeof RECOMMENDATION_EVENT_TYPE)[keyof typeof RECOMMENDATION_EVENT_TYPE];

export class RecommendationEvent {
  id: string;
  userId: string;
  productId: string;
  category: string;
  type: RecommendationEventType;
  createdAt: Date;

  constructor(data: Partial<RecommendationEvent> = {}) {
    Object.assign(this, {
      createdAt: new Date(),
      ...data,
    });
  }
}
