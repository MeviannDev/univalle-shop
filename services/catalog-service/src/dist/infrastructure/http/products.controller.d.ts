import { CreateProductUseCase } from '../../application/use-cases/create-product.use-case.js';
import { UpdateProductUseCase } from '../../application/use-cases/update-product.use-case.js';
import { ListProductsUseCase } from '../../application/use-cases/list-products.use-case.js';
import { DeleteProductUseCase } from '../../application/use-cases/delete-product.use-case.js';
import { GetProductUseCase } from '../../application/use-cases/get-product.use-case.js';
import { CreateProductDto } from '../../application/dtos/create-product.dto.js';
import { UpdateProductDto } from '../../application/dtos/update-product.dto.js';
import { ListProductsDto } from '../../application/dtos/list-products.dto.js';
export declare class ProductsController {
    private readonly createProduct;
    private readonly updateProduct;
    private readonly listProducts;
    private readonly deleteProduct;
    private readonly getProduct;
    constructor(createProduct: CreateProductUseCase, updateProduct: UpdateProductUseCase, listProducts: ListProductsUseCase, deleteProduct: DeleteProductUseCase, getProduct: GetProductUseCase);
    create(dto: CreateProductDto): Promise<{
        id: string;
        name: string;
        description: string | undefined;
        unitPrice: number;
        kind: import("../../domain/entities/product.entity.js").ProductKind;
        categoryId: string | undefined;
        stock: number | null;
        available: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    list(query: ListProductsDto): Promise<{
        items: {
            id: string;
            name: string;
            description: string | undefined;
            unitPrice: number;
            kind: import("../../domain/entities/product.entity.js").ProductKind;
            categoryId: string | undefined;
            stock: number | null;
            available: boolean;
            createdAt: Date;
            updatedAt: Date;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findOne(productId: string): Promise<{
        productId: string;
        name: string;
        unitPrice: number;
        available: boolean;
        stock: number | null;
    }>;
    update(productId: string, dto: UpdateProductDto): Promise<{
        id: string;
        name: string;
        description: string | undefined;
        unitPrice: number;
        kind: import("../../domain/entities/product.entity.js").ProductKind;
        categoryId: string | undefined;
        stock: number | null;
        available: boolean;
        updatedAt: Date;
    }>;
    remove(productId: string): Promise<void>;
}
