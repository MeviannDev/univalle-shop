var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import { ProductMapper } from './product.mapper.js';
import { CategoryMapper } from './category.mapper.js';
let MongoCatalogRepository = class MongoCatalogRepository {
    client;
    db;
    products;
    categories;
    async onModuleInit() {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27021/catalog';
        this.client = new MongoClient(uri);
        await this.client.connect();
        this.db = this.client.db();
        this.products = this.db.collection('products');
        this.categories = this.db.collection('categories');
        // Índices útiles
        await this.products.createIndex({ available: 1 });
        await this.products.createIndex({ categoryId: 1 });
        await this.categories.createIndex({ active: 1 });
    }
    async onModuleDestroy() {
        await this.client?.close();
    }
    // ==================== PRODUCTS ====================
    async saveProduct(product) {
        const doc = ProductMapper.toPersistence(product);
        await this.products.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
    }
    async findProductById(id) {
        const doc = await this.products.findOne({ _id: id.getValue() });
        return doc ? ProductMapper.toDomain(doc) : null;
    }
    async findProducts(params) {
        const page = params.page && params.page > 0 ? params.page : 1;
        const limit = Math.min(params.limit && params.limit > 0 ? params.limit : 20, 100);
        const skip = (page - 1) * limit;
        const filter = {};
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
    async deleteProduct(id) {
        await this.products.deleteOne({ _id: id.getValue() });
    }
    // ==================== CATEGORIES ====================
    async saveCategory(category) {
        const doc = CategoryMapper.toPersistence(category);
        await this.categories.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
    }
    async findCategoryById(id) {
        const doc = await this.categories.findOne({ _id: id.getValue() });
        return doc ? CategoryMapper.toDomain(doc) : null;
    }
    async findCategories(params) {
        const filter = {};
        if (params?.activeOnly) {
            filter.active = true;
        }
        const docs = await this.categories.find(filter).toArray();
        return docs.map(CategoryMapper.toDomain);
    }
    async deleteCategory(id) {
        await this.categories.deleteOne({ _id: id.getValue() });
    }
};
MongoCatalogRepository = __decorate([
    Injectable()
], MongoCatalogRepository);
export { MongoCatalogRepository };
//# sourceMappingURL=mongo-catalog.repository.js.map