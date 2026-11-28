import { Recommendation } from '../../../domain/entities/recommendation.entity.js';
import {
  type RecommendationRepositoryPort,
} from '../../../domain/ports/recommendation.repository.js';
import { GenerateRecommendationsUseCase } from '../../../application/use-cases/generate-recommendations.use-case.js';
import { RecordRecommendationEventUseCase } from '../../../application/use-cases/record-recommendation-event.use-case.js';
import { RecommendationController } from './recommendation.controller.js';

describe('RecommendationController', () => {
  it('returns the saved recent recommendations for a user', async () => {
    const savedRecommendations = [
      new Recommendation({
        id: 'recommendation-1',
        userId: 'user-1',
        productId: 'product-1',
      }),
    ];
    const repository: RecommendationRepositoryPort = {
      save: vi.fn(async (recommendation) => recommendation),
      saveEvent: vi.fn(async (event) => event),
      getSignals: vi.fn(async () => ({
        categoryWeights: {},
        productWeights: {},
        productPopularity: {},
        purchasedProductIds: [],
      })),
      findByUserId: vi.fn(async () => []),
      findLatestByUserId: vi.fn(async () => savedRecommendations),
      deleteAllByUserId: vi.fn(async () => undefined),
    };
    const controller = new RecommendationController(
      new GenerateRecommendationsUseCase(repository),
      new RecordRecommendationEventUseCase(repository),
      repository,
    );

    await expect(controller.findByUserId('user-1')).resolves.toEqual({
      userId: 'user-1',
      recommendations: savedRecommendations,
    });
    expect(repository.findLatestByUserId).toHaveBeenCalledWith('user-1');
  });
});
