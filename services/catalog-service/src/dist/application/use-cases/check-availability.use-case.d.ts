import { CatalogRepository } from '../../domain/ports/outbound/catalog.repository.js';
export declare class CheckAvailabilityUseCase {
    private readonly catalogRepository;
    constructor(catalogRepository: CatalogRepository);
    execute(productId: string, quantity: number): Promise<{
        available: boolean;
    }>;
}
