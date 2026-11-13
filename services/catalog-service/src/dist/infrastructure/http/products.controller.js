var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, } from '@nestjs/common';
import { CreateProductUseCase } from '../../application/use-cases/create-product.use-case.js';
import { UpdateProductUseCase } from '../../application/use-cases/update-product.use-case.js';
import { ListProductsUseCase } from '../../application/use-cases/list-products.use-case.js';
import { DeleteProductUseCase } from '../../application/use-cases/delete-product.use-case.js';
import { GetProductUseCase } from '../../application/use-cases/get-product.use-case.js';
import { CreateProductDto } from '../../application/dtos/create-product.dto.js';
import { UpdateProductDto } from '../../application/dtos/update-product.dto.js';
import { ListProductsDto } from '../../application/dtos/list-products.dto.js';
let ProductsController = class ProductsController {
    createProduct;
    updateProduct;
    listProducts;
    deleteProduct;
    getProduct;
    constructor(createProduct, updateProduct, listProducts, deleteProduct, getProduct) {
        this.createProduct = createProduct;
        this.updateProduct = updateProduct;
        this.listProducts = listProducts;
        this.deleteProduct = deleteProduct;
        this.getProduct = getProduct;
    }
    async create(dto) {
        return this.createProduct.execute(dto);
    }
    async list(query) {
        return this.listProducts.execute(query);
    }
    async findOne(productId) {
        return this.getProduct.execute(productId);
    }
    async update(productId, dto) {
        return this.updateProduct.execute(productId, dto);
    }
    async remove(productId) {
        await this.deleteProduct.execute(productId);
    }
};
__decorate([
    Post(),
    HttpCode(HttpStatus.CREATED),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateProductDto]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "create", null);
__decorate([
    Get(),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ListProductsDto]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "list", null);
__decorate([
    Get(':productId'),
    __param(0, Param('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findOne", null);
__decorate([
    Put(':productId'),
    __param(0, Param('productId')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateProductDto]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "update", null);
__decorate([
    Delete(':productId'),
    HttpCode(HttpStatus.NO_CONTENT),
    __param(0, Param('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "remove", null);
ProductsController = __decorate([
    Controller('products'),
    __metadata("design:paramtypes", [CreateProductUseCase,
        UpdateProductUseCase,
        ListProductsUseCase,
        DeleteProductUseCase,
        GetProductUseCase])
], ProductsController);
export { ProductsController };
//# sourceMappingURL=products.controller.js.map