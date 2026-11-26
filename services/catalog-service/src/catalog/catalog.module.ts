import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from './application/ports/product.repository.js';
import {
  INVENTORY_RESERVATION_REPOSITORY,
  type InventoryReservationRepository,
} from './application/ports/inventory-reservation.repository.js';
import { CommitStockReservationUseCase } from './application/use-cases/commit-stock-reservation.use-case.js';
import { CreateProductUseCase } from './application/use-cases/create-product.use-case.js';
import { DeleteProductUseCase } from './application/use-cases/delete-product.use-case.js';
import { GetProductUseCase } from './application/use-cases/get-product.use-case.js';
import { ListProductsUseCase } from './application/use-cases/list-products.use-case.js';
import { ReleaseStockReservationUseCase } from './application/use-cases/release-stock-reservation.use-case.js';
import { CancelStockReservationUseCase } from './application/use-cases/cancel-stock-reservation.use-case.js';
import { FulfillStockReservationUseCase } from './application/use-cases/fulfill-stock-reservation.use-case.js';
import { ReserveStockUseCase } from './application/use-cases/reserve-stock.use-case.js';
import { UpdateProductUseCase } from './application/use-cases/update-product.use-case.js';
import { InventoryReservationsController } from './infrastructure/http/inventory-reservations.controller.js';
import { ProductsController } from './infrastructure/http/products.controller.js';
import { ProductExceptionFilter } from './infrastructure/http/filters/product-exception.filter.js';
import { InternalApiKeyGuard } from './infrastructure/http/internal-api-key.guard.js';
import {
  InventoryReservationMongoSchema,
  InventoryReservationSchema,
} from './infrastructure/persistence/mongo/inventory-reservation.schema.js';
import { MongoInventoryReservationRepository } from './infrastructure/persistence/mongo/mongo-inventory-reservation.repository.js';
import { MongoProductRepository } from './infrastructure/persistence/mongo/mongo-product.repository.js';
import {
  ProductMongoSchema,
  ProductSchema,
} from './infrastructure/persistence/mongo/product.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductSchema.name, schema: ProductMongoSchema },
      {
        name: InventoryReservationSchema.name,
        schema: InventoryReservationMongoSchema,
      },
    ]),
  ],
  controllers: [ProductsController, InventoryReservationsController],
  providers: [
    InternalApiKeyGuard,
    ProductExceptionFilter,
    { provide: PRODUCT_REPOSITORY, useClass: MongoProductRepository },
    {
      provide: INVENTORY_RESERVATION_REPOSITORY,
      useClass: MongoInventoryReservationRepository,
    },
    {
      provide: ReserveStockUseCase,
      useFactory: (reservations: InventoryReservationRepository) =>
        new ReserveStockUseCase(reservations),
      inject: [INVENTORY_RESERVATION_REPOSITORY],
    },
    {
      provide: CommitStockReservationUseCase,
      useFactory: (reservations: InventoryReservationRepository) =>
        new CommitStockReservationUseCase(reservations),
      inject: [INVENTORY_RESERVATION_REPOSITORY],
    },
    {
      provide: ReleaseStockReservationUseCase,
      useFactory: (reservations: InventoryReservationRepository) =>
        new ReleaseStockReservationUseCase(reservations),
      inject: [INVENTORY_RESERVATION_REPOSITORY],
    },
    {
      provide: CancelStockReservationUseCase,
      useFactory: (reservations: InventoryReservationRepository) =>
        new CancelStockReservationUseCase(reservations),
      inject: [INVENTORY_RESERVATION_REPOSITORY],
    },
    {
      provide: FulfillStockReservationUseCase,
      useFactory: (reservations: InventoryReservationRepository) =>
        new FulfillStockReservationUseCase(reservations),
      inject: [INVENTORY_RESERVATION_REPOSITORY],
    },
    {
      provide: CreateProductUseCase,
      useFactory: (products: ProductRepository) =>
        new CreateProductUseCase(products),
      inject: [PRODUCT_REPOSITORY],
    },
    {
      provide: ListProductsUseCase,
      useFactory: (products: ProductRepository) =>
        new ListProductsUseCase(products),
      inject: [PRODUCT_REPOSITORY],
    },
    {
      provide: GetProductUseCase,
      useFactory: (products: ProductRepository) =>
        new GetProductUseCase(products),
      inject: [PRODUCT_REPOSITORY],
    },
    {
      provide: UpdateProductUseCase,
      useFactory: (products: ProductRepository) =>
        new UpdateProductUseCase(products),
      inject: [PRODUCT_REPOSITORY],
    },
    {
      provide: DeleteProductUseCase,
      useFactory: (products: ProductRepository) =>
        new DeleteProductUseCase(products),
      inject: [PRODUCT_REPOSITORY],
    },
  ],
})
export class CatalogModule {}
