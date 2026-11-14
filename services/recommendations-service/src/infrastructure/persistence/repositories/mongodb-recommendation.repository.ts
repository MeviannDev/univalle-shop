import { Injectable, OnModuleInit } from '@nestjs/common';
import { MongoClient, type Collection } from 'mongodb';
import { Recommendation } from '../../../domain/entities/recommendation.entity.js';
import { type RecommendationRepositoryPort } from '../../../domain/ports/recommendation.repository.js';

@Injectable()
export class MongoRecommendationRepository implements RecommendationRepositoryPort, OnModuleInit {
  private client: MongoClient;
  private collection: Collection<Recommendation>;

  async onModuleInit() {
    const mongoUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27020/univalle_recommendations';
    this.client = new MongoClient(mongoUri);
    await this.client.connect();
    this.collection = this.client.db().collection<Recommendation>('recommendations');
  }

  async save(recommendation: Recommendation): Promise<Recommendation> {
    await this.collection.insertOne(recommendation);
    return recommendation;
  }

  async findByUserId(userId: string): Promise<Recommendation[]> {
    return this.collection.find({ userId }).toArray();
  }

  async findLatestByUserId(userId: string): Promise<Recommendation[]> {
    return this.collection.find({ userId }).sort({ createdAt: -1 }).limit(5).toArray();
  }

  async deleteAllByUserId(userId: string): Promise<void> {
    await this.collection.deleteMany({ userId });
  }
}
