import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductSearchRepository } from '../../../application/ports/product-search.repository.js';
import { SearchableProduct } from '../../../domain/searchable-product.js';
import { ProductSearchDocument } from './product-search.schema.js';

@Injectable()
export class MongoProductSearchRepository
  implements ProductSearchRepository
{
  constructor(
    @InjectModel(ProductSearchDocument.name)
    private readonly productModel: Model<ProductSearchDocument>,
  ) {}

  async search(
    query: string,
    skip: number,
    limit: number,
  ): Promise<{ items: SearchableProduct[]; total: number }> {
    const filter = {
      isActive: true,
      $text: { $search: query },
    };
    const [items, total] = await Promise.all([
      this.productModel
        .find(filter, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    return { items: items.map((item) => this.toProduct(item)), total };
  }

  async index(product: SearchableProduct): Promise<void> {
    await this.productModel
      .updateOne(
        { productId: product.productId },
        { $set: product },
        { upsert: true, runValidators: true },
      )
      .exec();
  }

  async remove(productId: string): Promise<void> {
    await this.productModel.deleteOne({ productId }).exec();
  }

  private toProduct(
    document: ProductSearchDocument,
  ): SearchableProduct {
    return {
      productId: document.productId,
      name: document.name,
      description: document.description,
      category: document.category,
      price: document.price,
      ...(document.imageUrl === undefined
        ? {}
        : { imageUrl: document.imageUrl }),
      isActive: document.isActive,
    };
  }
}
