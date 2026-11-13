import { Product } from '../../entities/product.entity.js';
import { Category } from '../../entities/category.entity.js';
import { ProductId } from '../../value-objects/product-id.vo.js';
import { CategoryId } from '../../value-objects/category-id.vo.js';
export declare const CATALOG_REPOSITORY: unique symbol;
export interface CatalogRepository {
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
