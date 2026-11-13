import { CatalogRepository } from '../../domain/ports/outbound/catalog.repository.js';
export declare class CommitStockUseCase {
    private readonly catalogRepository;
    constructor(catalogRepository: CatalogRepository);
    execute(productId: string, quantity: number): Promise<void>;
}
