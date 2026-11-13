export class DomainError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}
export class ProductNotFoundError extends DomainError {
    constructor(productId) {
        super(`Product with id ${productId} not found`);
    }
}
export class CategoryNotFoundError extends DomainError {
    constructor(categoryId) {
        super(`Category with id ${categoryId} not found`);
    }
}
export class InsufficientStockError extends DomainError {
    constructor(productId, available, requested) {
        super(`Insufficient stock for product ${productId}. Available: ${available}, requested: ${requested}`);
    }
}
export class ProductNotAvailableError extends DomainError {
    constructor(productId) {
        super(`Product ${productId} is not available`);
    }
}
export class InvalidStockOperationError extends DomainError {
    constructor(message) {
        super(message);
    }
}
//# sourceMappingURL=domain.errors.js.map