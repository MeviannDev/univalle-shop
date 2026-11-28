import { RecordRecommendationEventUseCase } from './record-recommendation-event.use-case.js';
import { type RecommendationRepositoryPort } from '../../domain/ports/recommendation.repository.js';

describe('RecordRecommendationEventUseCase', () => {
  it('stores a normalized event with an id and timestamp', async () => {
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
      findLatestByUserId: vi.fn(async () => []),
      deleteAllByUserId: vi.fn(async () => undefined),
    };
    const useCase = new RecordRecommendationEventUseCase(repository);

    const event = await useCase.execute({
      userId: ' user-1 ',
      productId: ' product-1 ',
      category: ' tecnologia ',
      type: 'view',
    });

    expect(event).toMatchObject({
      userId: 'user-1',
      productId: 'product-1',
      category: 'tecnologia',
      type: 'view',
    });
    expect(event.id).toBeTruthy();
    expect(event.createdAt).toBeInstanceOf(Date);
    expect(repository.saveEvent).toHaveBeenCalledWith(event);
  });
});
