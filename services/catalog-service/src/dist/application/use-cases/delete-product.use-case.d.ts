import { CatalogRepository } from '../../domain/ports/outbound/catalog.repository.js';
export declare class DeleteProductUseCase {
    private readonly catalogRepository;
    constructor(catalogRepository: CatalogRepository);
    execute(productId: string): Promise<void>;
}
