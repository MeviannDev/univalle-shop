import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { CatalogRepository } from '../../domain/ports/outbound/catalog.repository.js';
import { Product } from '../../domain/entities/product.entity.js';
import { Category } from '../../domain/entities/category.entity.js';
import { ProductId } from '../../domain/value-objects/product-id.vo.js';
import { CategoryId } from '../../domain/value-objects/category-id.vo.js';
export declare class MongoCatalogRepository implements CatalogRepository, OnModuleInit, OnModuleDestroy {
    private client;
    private db;
    private products;
    private categories;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    saveProduct(product: Product): Promise<void>;
    findProductById(id: ProductId): Promise<Product | null>;
    findProducts(params: {
        page?: number;
        limit?: number;
        categoryId?: CategoryId;
        availableOnly?: boolean;
    }): Promise<{
        items: Product[];
        total: number;
    }>;
    deleteProduct(id: ProductId): Promise<void>;
    saveCategory(category: Category): Promise<void>;
    findCategoryById(id: CategoryId): Promise<Category | null>;
    findCategories(params?: {
        activeOnly?: boolean;
    }): Promise<Category[]>;
    deleteCategory(id: CategoryId): Promise<void>;
}
