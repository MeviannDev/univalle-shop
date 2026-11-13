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
export declare class Product {
    private props;
    private constructor();
    static create(params: {
        name: string;
        unitPrice: Money;
        kind?: ProductKind;
        description?: string;
        categoryId?: CategoryId;
        stock?: number;
    }): Product;
    static reconstitute(props: ProductProps): Product;
    get id(): ProductId;
    get name(): string;
    get description(): string | undefined;
    get unitPrice(): Money;
    get kind(): ProductKind;
    get categoryId(): CategoryId | undefined;
    get stock(): Stock | undefined;
    get available(): boolean;
    get createdAt(): Date;
    get updatedAt(): Date;
    checkAvailability(quantity: number): boolean;
    reserveStock(quantity: number): void;
    releaseStock(quantity: number): void;
    commitStock(quantity: number): void;
    updatePrice(unitPrice: Money): void;
    activate(): void;
    deactivate(): void;
    toOrderView(): {
        productId: string;
        name: string;
        unitPrice: number;
        available: boolean;
        stock: number | null;
    };
}
