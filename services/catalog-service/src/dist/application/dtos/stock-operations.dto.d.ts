/**
 * DTO para operaciones de stock:
 * - checkAvailability
 * - reserveStock
 * - releaseStock
 * - commitStock
 */
export declare class StockOperationDto {
    productId: string;
    quantity: number;
}
export declare class CheckAvailabilityDto {
    productId: string;
    quantity: number;
}
