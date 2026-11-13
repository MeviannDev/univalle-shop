import { ProductId } from '../value-objects/product-id.vo.js';
import { CategoryId } from '../value-objects/category-id.vo.js';
import { Money } from '../value-objects/money.vo.js';
import { Stock } from '../value-objects/stock.vo.js';

export type ProductKind = 'PRODUCT' | 'SERVICE';

export interface ProductProps {
  id: ProductId;
  name: string;
  description?: string;
  unitPrice: Money;
  kind: ProductKind;
  categoryId?: CategoryId;
  stock?: Stock;
  available: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Product {
  private constructor(private props: ProductProps) {}

  static create(params: {
    name: string;
    unitPrice: Money;
    kind?: ProductKind;
    description?: string;
    categoryId?: CategoryId;
    stock?: number;
  }): Product {
    const kind = params.kind ?? 'PRODUCT';
    const now = new Date();

    if (kind === 'PRODUCT' && (params.stock === undefined || params.stock < 0)) {
      throw new Error('PRODUCT must have a non-negative initial stock');
    }

    return new Product({
      id: ProductId.create(),
      name: params.name.trim(),
      description: params.description?.trim(),
      unitPrice: params.unitPrice,
      kind,
      categoryId: params.categoryId,
      stock: kind === 'PRODUCT' ? Stock.create(params.stock ?? 0) : undefined,
      available: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: ProductProps): Product {
    return new Product(props);
  }

  // Getters
  get id(): ProductId { return this.props.id; }
  get name(): string { return this.props.name; }
  get description(): string | undefined { return this.props.description; }
  get unitPrice(): Money { return this.props.unitPrice; }
  get kind(): ProductKind { return this.props.kind; }
  get categoryId(): CategoryId | undefined { return this.props.categoryId; }
  get stock(): Stock | undefined { return this.props.stock; }
  get available(): boolean { return this.props.available; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  // Métodos de stock (los que Orders necesita)
  checkAvailability(quantity: number): boolean {
    if (this.props.kind === 'SERVICE') return this.props.available;
    if (!this.props.stock) return false;
    return this.props.available && this.props.stock.canReserve(quantity);
  }

  reserveStock(quantity: number): void {
    if (this.props.kind === 'SERVICE') throw new Error('Cannot reserve stock for a SERVICE');
    if (!this.props.stock) throw new Error('Product has no stock information');
    if (!this.props.available) throw new Error('Product is not available');

    this.props.stock = this.props.stock.reserve(quantity);
    this.props.updatedAt = new Date();
  }

  releaseStock(quantity: number): void {
    if (this.props.kind === 'SERVICE') throw new Error('Cannot release stock for a SERVICE');
    if (!this.props.stock) throw new Error('Product has no stock information');

    this.props.stock = this.props.stock.release(quantity);
    this.props.updatedAt = new Date();
  }

  commitStock(quantity: number): void {
    if (this.props.kind === 'SERVICE') throw new Error('Cannot commit stock for a SERVICE');
    if (!this.props.stock) throw new Error('Product has no stock information');

    this.props.stock = this.props.stock.commit(quantity);
    this.props.updatedAt = new Date();
  }

  updatePrice(unitPrice: Money): void {
    this.props.unitPrice = unitPrice;
    this.props.updatedAt = new Date();
  }

  activate(): void {
    this.props.available = true;
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.available = false;
    this.props.updatedAt = new Date();
  }

  // Para el contrato de Orders
  toOrderView() {
    return {
      productId: this.props.id.getValue(),
      name: this.props.name,
      unitPrice: this.props.unitPrice.getCents(),
      available: this.props.available,
      stock: this.props.stock?.getAvailable() ?? null,
    };
  }
}