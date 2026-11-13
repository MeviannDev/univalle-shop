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
import { ProductId } from '../../domain/value-objects/product-id.vo.js';
import { Money } from '../../domain/value-objects/money.vo.js';
import { ProductNotFoundError } from '../../domain/errors/domain.errors.js';
let UpdateProductUseCase = class UpdateProductUseCase {
    catalogRepository;
    constructor(catalogRepository) {
        this.catalogRepository = catalogRepository;
    }
    async execute(productId, input) {
        const id = ProductId.fromString(productId);
        const product = await this.catalogRepository.findProductById(id);
        if (!product) {
            throw new ProductNotFoundError(productId);
        }
        if (input.unitPrice !== undefined) {
            product.updatePrice(Money.fromCents(input.unitPrice));
        }
        if (input.available === true) {
            product.activate();
        }
        else if (input.available === false) {
            product.deactivate();
        }
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
            updatedAt: product.updatedAt,
        };
    }
};
UpdateProductUseCase = __decorate([
    Injectable(),
    __param(0, Inject(CATALOG_REPOSITORY)),
    __metadata("design:paramtypes", [Object])
], UpdateProductUseCase);
export { UpdateProductUseCase };
//# sourceMappingURL=update-product.use-case.js.map