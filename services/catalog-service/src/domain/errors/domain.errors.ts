export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ProductNotFoundError extends DomainError {
  constructor(productId: string) {
    super(`Product with id ${productId} not found`);
  }
}

export class CategoryNotFoundError extends DomainError {
  constructor(categoryId: string) {
    super(`Category with id ${categoryId} not found`);
  }
}

export class InsufficientStockError extends DomainError {
  constructor(productId: string, available: number, requested: number) {
    super(
      `Insufficient stock for product ${productId}. Available: ${available}, requested: ${requested}`,
    );
  }
}

export class ProductNotAvailableError extends DomainError {
  constructor(productId: string) {
    super(`Product ${productId} is not available`);
  }
}

export class InvalidStockOperationError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}