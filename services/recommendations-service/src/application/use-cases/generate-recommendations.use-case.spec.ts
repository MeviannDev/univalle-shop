import { GenerateRecommendationsUseCase } from './generate-recommendations.use-case.js';
import {
  type RecommendationRepositoryPort,
  type RecommendationSignals,
} from '../../domain/ports/recommendation.repository.js';

describe('GenerateRecommendationsUseCase', () => {
  let repository: RecommendationRepositoryPort;
  let signals: RecommendationSignals;
  let useCase: GenerateRecommendationsUseCase;

  beforeEach(() => {
    signals = {
      categoryWeights: { tecnologia: 4, libros: 1 },
      productWeights: { 'producto-visto': 1 },
      productPopularity: {
        'producto-popular': 8,
        'producto-visto': 2,
      },
      purchasedProductIds: ['producto-comprado'],
    };
    repository = {
      save: vi.fn(async (recommendation) => recommendation),
      saveEvent: vi.fn(async (event) => event),
      getSignals: vi.fn(async () => signals),
      findByUserId: vi.fn(async () => []),
      findLatestByUserId: vi.fn(async () => []),
      deleteAllByUserId: vi.fn(async () => undefined),
    };
    useCase = new GenerateRecommendationsUseCase(repository);
  });

  it('ranks candidates using user interests and popularity, excluding purchases', async () => {
    const recommendations = await useCase.execute({
      userId: 'user-1',
      productIds: [
        'producto-popular',
        'producto-visto',
        'producto-comprado',
        'producto-popular',
      ],
      category: 'tecnologia',
      productCategories: {
        'producto-popular': 'libros',
        'producto-visto': 'tecnologia',
      },
    });

    expect(recommendations.map(({ productId }) => productId)).toEqual([
      'producto-visto',
      'producto-popular',
    ]);
    expect(recommendations[0].reason).toContain(
      'Has mostrado interés en este producto',
    );
    expect(recommendations[0].scoreValue).toBeGreaterThan(
      recommendations[1].scoreValue,
    );
    expect(repository.save).toHaveBeenCalledTimes(2);
  });

  it('rejects requests without candidates', async () => {
    await expect(
      useCase.execute({
        userId: 'user-1',
        productIds: [],
        category: 'tecnologia',
      }),
    ).rejects.toThrow('El usuario, la categoría y al menos un producto son obligatorios.');
    expect(repository.getSignals).not.toHaveBeenCalled();
  });

  it('returns an empty list when all candidates were purchased', async () => {
    const recommendations = await useCase.execute({
      userId: 'user-1',
      productIds: ['producto-comprado'],
      category: 'tecnologia',
    });

    expect(recommendations).toEqual([]);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
