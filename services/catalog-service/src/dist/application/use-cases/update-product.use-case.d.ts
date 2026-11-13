import { CatalogRepository } from '../../domain/ports/outbound/catalog.repository.js';
export interface UpdateProductInput {
    name?: string;
    unitPrice?: number;
    description?: string;
    available?: boolean;
}
export declare class UpdateProductUseCase {
    private readonly catalogRepository;
    constructor(catalogRepository: CatalogRepository);
    execute(productId: string, input: UpdateProductInput): Promise<{
        id: string;
        name: string;
        description: string | undefined;
        unitPrice: number;
        kind: import("../../domain/entities/product.entity.js").ProductKind;
        categoryId: string | undefined;
        stock: number | null;
        available: boolean;
        updatedAt: Date;
    }>;
}
