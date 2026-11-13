export declare class DomainError extends Error {
    constructor(message: string);
}
export declare class ProductNotFoundError extends DomainError {
    constructor(productId: string);
}
export declare class CategoryNotFoundError extends DomainError {
    constructor(categoryId: string);
}
export declare class InsufficientStockError extends DomainError {
    constructor(productId: string, available: number, requested: number);
}
export declare class ProductNotAvailableError extends DomainError {
    constructor(productId: string);
}
export declare class InvalidStockOperationError extends DomainError {
    constructor(message: string);
}
