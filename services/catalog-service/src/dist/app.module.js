var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { ProductsController } from './infrastructure/http/products.controller.js';
import { StockController } from './infrastructure/http/stock.controller.js';
import { MongoCatalogRepository } from './infrastructure/persistence/mongo-catalog.repository.js';
import { CATALOG_REPOSITORY } from './domain/ports/outbound/catalog.repository.js';
// Use Cases - Stock
import { GetProductUseCase } from './application/use-cases/get-product.use-case.js';
import { CheckAvailabilityUseCase } from './application/use-cases/check-availability.use-case.js';
import { ReserveStockUseCase } from './application/use-cases/reserve-stock.use-case.js';
import { ReleaseStockUseCase } from './application/use-cases/release-stock.use-case.js';
import { CommitStockUseCase } from './application/use-cases/commit-stock.use-case.js';
// Use Cases - CRUD
import { CreateProductUseCase } from './application/use-cases/create-product.use-case.js';
import { UpdateProductUseCase } from './application/use-cases/update-product.use-case.js';
import { ListProductsUseCase } from './application/use-cases/list-products.use-case.js';
import { DeleteProductUseCase } from './application/use-cases/delete-product.use-case.js';
let AppModule = class AppModule {
};
AppModule = __decorate([
    Module({
        controllers: [ProductsController, StockController],
        providers: [
            // Repository
            {
                provide: CATALOG_REPOSITORY,
                useClass: MongoCatalogRepository,
            },
            MongoCatalogRepository,
            // Stock use cases
            GetProductUseCase,
            CheckAvailabilityUseCase,
            ReserveStockUseCase,
            ReleaseStockUseCase,
            CommitStockUseCase,
            // CRUD use cases
            CreateProductUseCase,
            UpdateProductUseCase,
            ListProductsUseCase,
            DeleteProductUseCase,
        ],
    })
], AppModule);
export { AppModule };
//# sourceMappingURL=app.module.js.map