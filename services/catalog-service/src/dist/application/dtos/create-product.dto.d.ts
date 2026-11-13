export declare enum ProductKindDto {
    PRODUCT = "PRODUCT",
    SERVICE = "SERVICE"
}
export declare class CreateProductDto {
    name: string;
    description?: string;
    /** Precio en centavos de COP (entero) */
    unitPrice: number;
    kind?: ProductKindDto;
    categoryId?: string;
    /** Solo aplica cuando kind = PRODUCT. Máximo 99 según SDD. */
    stock?: number;
}
