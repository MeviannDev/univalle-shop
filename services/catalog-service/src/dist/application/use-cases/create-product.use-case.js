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
import { Inject, Injectable } from '@nestjs/common';
import { CATALOG_REPOSITORY, } from '../../domain/ports/outbound/catalog.repository.js';
import { Product } from '../../domain/entities/product.entity.js';
import { Money } from '../../domain/value-objects/money.vo.js';
import { CategoryId } from '../../domain/value-objects/category-id.vo.js';
let CreateProductUseCase = class CreateProductUseCase {
    catalogRepository;
    constructor(catalogRepository) {
        this.catalogRepository = catalogRepository;
    }
    async execute(input) {
        const product = Product.create({
            name: input.name,
            unitPrice: Money.fromCents(input.unitPrice),
            kind: input.kind ?? 'PRODUCT',
            description: input.description,
            categoryId: input.categoryId
                ? CategoryId.fromString(input.categoryId)
                : undefined,
            stock: input.stock,
        });
        await this.catalogRepository.saveProduct(product);
        return {
            id: product.id.getValue(),
            name: product.name,
            description: product.description,
            unitPrice: product.unitPrice.getCents(),
            kind: product.kind,
            categoryId: product.categoryId?.getValue(),
            stock: product.stock?.getAvailable() ?? null,
            available: product.available,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
        };
    }
};
CreateProductUseCase = __decorate([
    Injectable(),
    __param(0, Inject(CATALOG_REPOSITORY)),
    __metadata("design:paramtypes", [Object])
], CreateProductUseCase);
export { CreateProductUseCase };
//# sourceMappingURL=create-product.use-case.js.map