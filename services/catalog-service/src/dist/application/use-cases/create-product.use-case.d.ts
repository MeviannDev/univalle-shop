import { CatalogRepository } from '../../domain/ports/outbound/catalog.repository.js';
import { ProductKind } from '../../domain/entities/product.entity.js';
export interface CreateProductInput {
    name: string;
    unitPrice: number;
    kind?: ProductKind;
    description?: string;
    categoryId?: string;
    stock?: number;
}
export declare class CreateProductUseCase {
    private readonly catalogRepository;
    constructor(catalogRepository: CatalogRepository);
    execute(input: CreateProductInput): Promise<{
        id: string;
        name: string;
        description: string | undefined;
        unitPrice: number;
        kind: ProductKind;
        categoryId: string | undefined;
        stock: number | null;
        available: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
