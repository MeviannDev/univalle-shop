import { CatalogRepository } from '../../domain/ports/outbound/catalog.repository.js';
export interface ListProductsInput {
    page?: number;
    limit?: number;
    categoryId?: string;
    availableOnly?: boolean;
}
export declare class ListProductsUseCase {
    private readonly catalogRepository;
    constructor(catalogRepository: CatalogRepository);
    execute(input?: ListProductsInput): Promise<{
        items: {
            id: string;
            name: string;
            description: string | undefined;
            unitPrice: number;
            kind: import("../../domain/entities/product.entity.js").ProductKind;
            categoryId: string | undefined;
            stock: number | null;
            available: boolean;
            createdAt: Date;
            updatedAt: Date;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
}
