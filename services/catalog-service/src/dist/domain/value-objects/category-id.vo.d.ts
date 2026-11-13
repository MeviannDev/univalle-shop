export declare class CategoryId {
    private readonly value;
    private constructor();
    static create(id?: string): CategoryId;
    static fromString(id: string): CategoryId;
    getValue(): string;
    equals(other: CategoryId): boolean;
    toString(): string;
}
