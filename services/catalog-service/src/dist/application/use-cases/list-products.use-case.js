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
import { CategoryId } from '../../domain/value-objects/category-id.vo.js';
let ListProductsUseCase = class ListProductsUseCase {
    catalogRepository;
    constructor(catalogRepository) {
        this.catalogRepository = catalogRepository;
    }
    async execute(input = {}) {
        const page = input.page && input.page > 0 ? input.page : 1;
        const limit = Math.min(input.limit && input.limit > 0 ? input.limit : 20, 100);
        const result = await this.catalogRepository.findProducts({
            page,
            limit,
            categoryId: input.categoryId
                ? CategoryId.fromString(input.categoryId)
                : undefined,
            availableOnly: input.availableOnly,
        });
        return {
            items: result.items.map((product) => ({
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
            })),
            total: result.total,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit),
        };
    }
};
ListProductsUseCase = __decorate([
    Injectable(),
    __param(0, Inject(CATALOG_REPOSITORY)),
    __metadata("design:paramtypes", [Object])
], ListProductsUseCase);
export { ListProductsUseCase };
//# sourceMappingURL=list-products.use-case.js.map