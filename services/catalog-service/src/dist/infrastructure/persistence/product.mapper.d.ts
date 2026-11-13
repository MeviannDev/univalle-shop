import { Product, ProductKind } from '../../domain/entities/product.entity.js';
export interface ProductDocument {
    _id: string;
    name: string;
    description?: string;
    unitPrice: number;
    kind: ProductKind;
    categoryId?: string;
    stock?: {
        available: number;
        reserved: number;
    };
    available: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare class ProductMapper {
    static toDomain(doc: ProductDocument): Product;
    static toPersistence(product: Product): ProductDocument;
}
