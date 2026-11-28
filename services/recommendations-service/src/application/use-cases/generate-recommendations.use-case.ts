import { Inject, Injectable } from '@nestjs/common';
import { Recommendation } from '../../domain/entities/recommendation.entity.js';
import { RECOMMENDATION_SCORE } from '../../domain/value-objects/recommendation-score.js';
import {
  RECOMMENDATION_REPOSITORY_PORT,
  type RecommendationRepositoryPort,
} from '../../domain/ports/recommendation.repository.js';
import { GenerateRecommendationDto } from '../dtos/generate-recommendation.dto.js';

@Injectable()
export class GenerateRecommendationsUseCase {
  constructor(
    @Inject(RECOMMENDATION_REPOSITORY_PORT)
    private readonly recommendationRepository: RecommendationRepositoryPort,
  ) {}

  async execute(dto: GenerateRecommendationDto): Promise<Recommendation[]> {
    if (
      !dto.userId?.trim() ||
      !dto.category?.trim() ||
      !Array.isArray(dto.productIds) ||
      dto.productIds.length === 0
    ) {
      throw new Error(
        'El usuario, la categoría y al menos un producto son obligatorios.',
      );
    }

    const productIds = [
      ...new Set(
        dto.productIds.map((productId) =>
          typeof productId === 'string' ? productId.trim() : '',
        ),
      ),
    ];
    if (productIds.some((productId) => !productId)) {
      throw new Error('Los identificadores de producto no pueden estar vacíos.');
    }

    const signals = await this.recommendationRepository.getSignals(
      dto.userId.trim(),
    );
    const eligibleProductIds = productIds.filter(
      (productId) => !signals.purchasedProductIds.includes(productId),
    );
    const categories = new Map(
      eligibleProductIds.map((productId) => {
        const assignedCategory = dto.productCategories?.[productId];
        const category =
          typeof assignedCategory === 'string' && assignedCategory.trim()
            ? assignedCategory.trim()
            : dto.category.trim();
        return [productId, category];
      }),
    );

    const maxCategoryWeight = maxValue(Object.values(signals.categoryWeights));
    const maxProductWeight = maxValue(Object.values(signals.productWeights));
    const maxPopularity = maxValue(
      eligibleProductIds.map(
        (productId) => signals.productPopularity[productId] ?? 0,
      ),
    );
    const weights = [
      { available: maxCategoryWeight > 0, weight: 0.5 },
      { available: maxProductWeight > 0, weight: 0.3 },
      { available: maxPopularity > 0, weight: 0.2 },
    ];
    const availableWeight = weights
      .filter(({ available }) => available)
      .reduce((total, { weight }) => total + weight, 0);

    const recommendations = eligibleProductIds.map((productId) => {
      const category = categories.get(productId) ?? dto.category.trim();
      const categoryWeight = signals.categoryWeights[category] ?? 0;
      const productWeight = signals.productWeights[productId] ?? 0;
      const popularity = signals.productPopularity[productId] ?? 0;
      let weightedScore = 0;

      if (maxCategoryWeight > 0) {
        weightedScore += (categoryWeight / maxCategoryWeight) * 0.5;
      }
      if (maxProductWeight > 0) {
        weightedScore += (productWeight / maxProductWeight) * 0.3;
      }
      if (maxPopularity > 0) {
        weightedScore += (popularity / maxPopularity) * 0.2;
      }

      const scoreValue =
        availableWeight > 0
          ? Math.round((weightedScore / availableWeight) * 100)
          : 0;
      const score =
        scoreValue >= 67
          ? RECOMMENDATION_SCORE.HIGH
          : scoreValue >= 34
            ? RECOMMENDATION_SCORE.MEDIUM
            : RECOMMENDATION_SCORE.LOW;
      const reasons = [];

      if (categoryWeight > 0) {
        reasons.push(`Coincide con tu interés en ${category}`);
      }
      if (productWeight > 0) {
        reasons.push('Has mostrado interés en este producto');
      }
      if (popularity > 0) {
        reasons.push('Tiene buena interacción entre los usuarios');
      }
      if (reasons.length === 0) {
        reasons.push(`Producto candidato de la categoría ${category}`);
      }

      return new Recommendation({
        id: crypto.randomUUID(),
        userId: dto.userId.trim(),
        productId,
        category,
        score,
        scoreValue,
        reason: reasons.join('. ') + '.',
      });
    });

    recommendations.sort(
      (left, right) =>
        right.scoreValue - left.scoreValue ||
        left.productId.localeCompare(right.productId),
    );
    return Promise.all(
      recommendations.map((recommendation) =>
        this.recommendationRepository.save(recommendation),
      ),
    );
  }
}

function maxValue(values: number[]): number {
  return values.reduce((maximum, value) => Math.max(maximum, value), 0);
}
