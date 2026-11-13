import { CatalogRepository } from '../../domain/ports/outbound/catalog.repository.js';
export declare class ReserveStockUseCase {
    private readonly catalogRepository;
    constructor(catalogRepository: CatalogRepository);
    execute(productId: string, quantity: number): Promise<void>;
}
