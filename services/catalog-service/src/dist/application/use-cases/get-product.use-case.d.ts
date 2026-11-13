import { CatalogRepository } from '../../domain/ports/outbound/catalog.repository.js';
export declare class GetProductUseCase {
    private readonly catalogRepository;
    constructor(catalogRepository: CatalogRepository);
    execute(productId: string): Promise<{
        productId: string;
        name: string;
        unitPrice: number;
        available: boolean;
        stock: number | null;
    }>;
}
