import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MongoClient, type Collection, type Document } from 'mongodb';
import { Recommendation } from '../../../domain/entities/recommendation.entity.js';
import { RecommendationEvent } from '../../../domain/entities/recommendation-event.entity.js';
import {
  type RecommendationRepositoryPort,
  type RecommendationSignals,
} from '../../../domain/ports/recommendation.repository.js';

@Injectable()
export class MongoRecommendationRepository
  implements RecommendationRepositoryPort, OnModuleDestroy, OnModuleInit
{
  private client: MongoClient;
  private collection: Collection<Recommendation>;
  private events: Collection<RecommendationEvent>;

  async onModuleInit() {
    const mongoUri =
      process.env.MONGODB_URI ??
      'mongodb://localhost:27020/univalle_recommendations';
    this.client = new MongoClient(mongoUri);
    await this.client.connect();
    const database = this.client.db();
    this.collection = database.collection<Recommendation>('recommendations');
    this.events = database.collection<RecommendationEvent>(
      'recommendation_events',
    );
    await Promise.all([
      this.collection.createIndex({ userId: 1, createdAt: -1 }),
      this.events.createIndex({ userId: 1, createdAt: -1 }),
      this.events.createIndex({ userId: 1, type: 1, productId: 1 }),
      this.events.createIndex({ createdAt: -1 }),
    ]);
  }

  async onModuleDestroy() {
    await this.client?.close();
  }

  async save(recommendation: Recommendation): Promise<Recommendation> {
    await this.collection.insertOne(recommendation);
    return recommendation;
  }

  async saveEvent(event: RecommendationEvent): Promise<RecommendationEvent> {
    await this.events.insertOne(event);
    return event;
  }

  async getSignals(userId: string): Promise<RecommendationSignals> {
    const recentSince = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const weightedEvents = {
      $sum: {
        $cond: [{ $eq: ['$type', 'purchase'] }, 3, 1],
      },
    };
    const [categoryWeights, productWeights, productPopularity, purchases] =
      await Promise.all([
        this.aggregateWeights(
          { userId, createdAt: { $gte: recentSince } },
          '$category',
          weightedEvents,
        ),
        this.aggregateWeights(
          { userId, createdAt: { $gte: recentSince } },
          '$productId',
          weightedEvents,
        ),
        this.aggregateWeights(
          { createdAt: { $gte: recentSince } },
          '$productId',
          weightedEvents,
        ),
        this.events
          .find({ userId, type: 'purchase' })
          .project<{ productId: string }>({ productId: 1, _id: 0 })
          .toArray(),
      ]);

    return {
      categoryWeights,
      productWeights,
      productPopularity,
      purchasedProductIds: [...new Set(purchases.map(({ productId }) => productId))],
    };
  }

  async findByUserId(userId: string): Promise<Recommendation[]> {
    return this.collection.find({ userId }).sort({ createdAt: -1 }).toArray();
  }

  async findLatestByUserId(userId: string): Promise<Recommendation[]> {
    return this.collection
      .find({ userId })
      .sort({ createdAt: -1, _id: -1 })
      .limit(5)
      .toArray();
  }

  async deleteAllByUserId(userId: string): Promise<void> {
    await this.collection.deleteMany({ userId });
  }

  private async aggregateWeights(
    match: Document,
    groupField: string,
    weightedEvents: Document,
  ): Promise<Record<string, number>> {
    const rows = await this.events
      .aggregate<{ _id: string; weight: number }>([
        { $match: match },
        { $group: { _id: groupField, weight: weightedEvents } },
      ])
      .toArray();
    return Object.fromEntries(rows.map(({ _id, weight }) => [_id, weight]));
  }
}
