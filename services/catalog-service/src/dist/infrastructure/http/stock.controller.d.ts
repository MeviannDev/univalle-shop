import { CheckAvailabilityUseCase } from '../../application/use-cases/check-availability.use-case.js';
import { ReserveStockUseCase } from '../../application/use-cases/reserve-stock.use-case.js';
import { ReleaseStockUseCase } from '../../application/use-cases/release-stock.use-case.js';
import { CommitStockUseCase } from '../../application/use-cases/commit-stock.use-case.js';
import { StockOperationDto } from '../../application/dtos/stock-operations.dto.js';
/**
 * Endpoints INTERNOS de stock.
 * Estos NO deben exponerse a través del API Gateway.
 * Solo deben ser consumidos por orders-service (red interna / docker network).
 */
export declare class StockController {
    private readonly checkAvailability;
    private readonly reserveStock;
    private readonly releaseStock;
    private readonly commitStock;
    constructor(checkAvailability: CheckAvailabilityUseCase, reserveStock: ReserveStockUseCase, releaseStock: ReleaseStockUseCase, commitStock: CommitStockUseCase);
    check(dto: StockOperationDto): Promise<{
        available: boolean;
    }>;
    reserve(dto: StockOperationDto): Promise<void>;
    release(dto: StockOperationDto): Promise<void>;
    commit(dto: StockOperationDto): Promise<void>;
}
