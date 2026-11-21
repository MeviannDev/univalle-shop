import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from './application/ports/product.repository.js';
import { CreateProductUseCase } from './application/use-cases/create-product.use-case.js';
import { DeleteProductUseCase } from './application/use-cases/delete-product.use-case.js';
import { GetProductUseCase } from './application/use-cases/get-product.use-case.js';
import { ListProductsUseCase } from './application/use-cases/list-products.use-case.js';
import { UpdateProductUseCase } from './application/use-cases/update-product.use-case.js';
import { ProductsController } from './infrastructure/http/products.controller.js';
import { MongoProductRepository } from './infrastructure/persistence/mongo/mongo-product.repository.js';
import {
  ProductMongoSchema,
  ProductSchema,
} from './infrastructure/persistence/mongo/product.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductSchema.name, schema: ProductMongoSchema },
    ]),
  ],
  controllers: [ProductsController],
  providers: [
    { provide: PRODUCT_REPOSITORY, useClass: MongoProductRepository },
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
