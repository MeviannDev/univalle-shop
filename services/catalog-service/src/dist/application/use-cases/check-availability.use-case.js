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
import { ProductNotFoundError } from '../../domain/errors/domain.errors.js';
let CheckAvailabilityUseCase = class CheckAvailabilityUseCase {
    catalogRepository;
    constructor(catalogRepository) {
        this.catalogRepository = catalogRepository;
    }
    async execute(productId, quantity) {
        if (quantity <= 0) {
            throw new Error('Quantity must be greater than 0');
        }
        const id = ProductId.fromString(productId);
        const product = await this.catalogRepository.findProductById(id);
        if (!product) {
            throw new ProductNotFoundError(productId);
        }
        const available = product.checkAvailability(quantity);
        return { available };
    }
};
CheckAvailabilityUseCase = __decorate([
    Injectable(),
    __param(0, Inject(CATALOG_REPOSITORY)),
    __metadata("design:paramtypes", [Object])
], CheckAvailabilityUseCase);
export { CheckAvailabilityUseCase };
//# sourceMappingURL=check-availability.use-case.js.map