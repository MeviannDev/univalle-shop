import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { MongoClient, Db, Collection } from 'mongodb';
import { CatalogRepository } from '../../domain/ports/outbound/catalog.repository.js';
import { Product } from '../../domain/entities/product.entity.js';
import { Category } from '../../domain/entities/category.entity.js';
import { ProductId } from '../../domain/value-objects/product-id.vo.js';
import { CategoryId } from '../../domain/value-objects/category-id.vo.js';
import { ProductMapper, ProductDocument } from './product.mapper.js';
import { CategoryMapper, CategoryDocument } from './category.mapper.js';

@Injectable()
export class MongoCatalogRepository
  implements CatalogRepository, OnModuleInit, OnModuleDestroy
{
  private client!: MongoClient;
  private db!: Db;
  private products!: Collection<ProductDocument>;
  private categories!: Collection<CategoryDocument>;

  async onModuleInit() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27021/catalog';
    this.client = new MongoClient(uri);
    await this.client.connect();
    this.db = this.client.db();
    this.products = this.db.collection<ProductDocument>('products');
    this.categories = this.db.collection<CategoryDocument>('categories');

    // Índices útiles
    await this.products.createIndex({ available: 1 });
    await this.products.createIndex({ categoryId: 1 });
    await this.categories.createIndex({ active: 1 });
  }

  async onModuleDestroy() {
    await this.client?.close();
  }

  // ==================== PRODUCTS ====================

  async saveProduct(product: Product): Promise<void> {
    const doc = ProductMapper.toPersistence(product);
    await this.products.updateOne(
      { _id: doc._id },
      { $set: doc },
      { upsert: true },
    );
  }

  async findProductById(id: ProductId): Promise<Product | null> {
    const doc = await this.products.findOne({ _id: id.getValue() });
    return doc ? ProductMapper.toDomain(doc) : null;
  }

  async findProducts(params: {
    page?: number;
    limit?: number;
    categoryId?: CategoryId;
    availableOnly?: boolean;
  }): Promise<{ items: Product[]; total: number }> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = Math.min(params.limit && params.limit > 0 ? params.limit : 20, 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (params.categoryId) {
      filter.categoryId = params.categoryId.getValue();
    }
    if (params.availableOnly) {
      filter.available = true;
    }

    const [docs, total] = await Promise.all([
      this.products.find(filter).skip(skip).limit(limit).toArray(),
      this.products.countDocuments(filter),
    ]);

    return {
      items: docs.map(ProductMapper.toDomain),
      total,
    };
  }

  async deleteProduct(id: ProductId): Promise<void> {
    await this.products.deleteOne({ _id: id.getValue() });
  }

  // ==================== CATEGORIES ====================

  async saveCategory(category: Category): Promise<void> {
    const doc = CategoryMapper.toPersistence(category);
    await this.categories.updateOne(
      { _id: doc._id },
      { $set: doc },
      { upsert: true },
    );
  }

  async findCategoryById(id: CategoryId): Promise<Category | null> {
    const doc = await this.categories.findOne({ _id: id.getValue() });
    return doc ? CategoryMapper.toDomain(doc) : null;
  }

  async findCategories(params?: { activeOnly?: boolean }): Promise<Category[]> {
    const filter: Record<string, unknown> = {};
    if (params?.activeOnly) {
      filter.active = true;
    }

    const docs = await this.categories.find(filter).toArray();
    return docs.map(CategoryMapper.toDomain);
  }

  async deleteCategory(id: CategoryId): Promise<void> {
    await this.categories.deleteOne({ _id: id.getValue() });
  }
}