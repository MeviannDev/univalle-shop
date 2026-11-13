export declare class ProductId {
    private readonly value;
    private constructor();
    static create(id?: string): ProductId;
    static fromString(id: string): ProductId;
    getValue(): string;
    equals(other: ProductId): boolean;
    toString(): string;
}
