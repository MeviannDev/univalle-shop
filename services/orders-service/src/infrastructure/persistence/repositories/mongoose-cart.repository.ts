import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Cart } from '../../../domain/entities/cart.js';
import type { CartRepository } from '../../../domain/ports/outbound/cart-repository.port.js';
import type { UserId } from '../../../domain/value-objects/user-id.js';
import { CartMapper } from '../mappers/cart.mapper.js';
import { CartSchema } from '../schemas/cart.schema.js';

@Injectable()
export class MongooseCartRepository implements CartRepository {
  constructor(
    @InjectModel(CartSchema.name)
    private readonly model: Model<CartSchema>,
  ) {}

  async findActiveByUserId(userId: UserId): Promise<Cart | null> {
    const document = await this.model.findOne({ userId: userId.value }).exec();
    return document ? CartMapper.toDomain(document) : null;
  }

  async save(cart: Cart): Promise<void> {
    const { _id, ...fields } = CartMapper.toPersistence(cart);
    try {
      await this.model.updateOne(
        { userId: cart.userId.value },
        { $set: fields, $setOnInsert: { _id } },
        { upsert: true, runValidators: true },
      ).exec();
    } catch (error) {
      if (!this.isDuplicateKey(error)) {
        throw error;
      }
      const result = await this.model.updateOne(
        { userId: cart.userId.value },
        { $set: fields },
        { runValidators: true },
      ).exec();
      if (result.matchedCount === 0) {
        throw error;
      }
    }
  }

  private isDuplicateKey(error: unknown): error is { code: number } {
    return typeof error === 'object' && error !== null && 'code' in error &&
      (error as { code?: unknown }).code === 11000;
  }
}
