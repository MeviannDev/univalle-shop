import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PRODUCT_SEARCH_REPOSITORY,
} from './application/ports/product-search.repository.js';
import { IndexProductUseCase } from './application/use-cases/index-product.use-case.js';
import { RemoveIndexedProductUseCase } from './application/use-cases/remove-indexed-product.use-case.js';
import { SearchProductsUseCase } from './application/use-cases/search-products.use-case.js';
import { ProductIndexController } from './infrastructure/http/product-index.controller.js';
import { SearchController } from './infrastructure/http/search.controller.js';
import { MongoProductSearchRepository } from './infrastructure/persistence/mongodb/mongo-product-search.repository.js';
import {
  ProductSearchDocument,
  ProductSearchSchema,
} from './infrastructure/persistence/mongodb/product-search.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductSearchDocument.name, schema: ProductSearchSchema },
    ]),
  ],
  controllers: [SearchController, ProductIndexController],
  providers: [
    MongoProductSearchRepository,
    {
      provide: PRODUCT_SEARCH_REPOSITORY,
      useExisting: MongoProductSearchRepository,
    },
    {
      provide: SearchProductsUseCase,
      useFactory: (repository: MongoProductSearchRepository) =>
        new SearchProductsUseCase(repository),
      inject: [PRODUCT_SEARCH_REPOSITORY],
    },
    {
      provide: IndexProductUseCase,
      useFactory: (repository: MongoProductSearchRepository) =>
        new IndexProductUseCase(repository),
      inject: [PRODUCT_SEARCH_REPOSITORY],
    },
    {
      provide: RemoveIndexedProductUseCase,
      useFactory: (repository: MongoProductSearchRepository) =>
        new RemoveIndexedProductUseCase(repository),
      inject: [PRODUCT_SEARCH_REPOSITORY],
    },
  ],
})
export class SearchModule {}
