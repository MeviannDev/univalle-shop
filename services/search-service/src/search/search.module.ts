import { Module } from '@nestjs/common';
import { ReindexCatalog } from './application/use-cases/reindex-catalog.js';
import { SearchItems } from './application/use-cases/search-items.js';
import { CATALOG_SOURCE, type CatalogSource } from './domain/ports/catalog-source.port.js';
import {
  SEARCH_INDEX_REPOSITORY,
  type SearchIndexRepository,
} from './domain/ports/search-index.repository.js';
import { HealthController } from './infrastructure/adapters/in/http/controllers/health.controller.js';
import { InternalController } from './infrastructure/adapters/in/http/controllers/internal.controller.js';
import { SearchController } from './infrastructure/adapters/in/http/controllers/search.controller.js';
import { InternalApiKeyGuard } from './infrastructure/adapters/in/http/guards/internal-api-key.guard.js';
import { ReindexScheduler } from './infrastructure/adapters/in/scheduler/reindex.scheduler.js';
import { HttpCatalogSource } from './infrastructure/adapters/out/catalog/http-catalog-source.js';
import { InMemorySearchIndexRepository } from './infrastructure/adapters/out/persistence/in-memory-search-index.repository.js';
import { MongoSearchIndexRepository } from './infrastructure/adapters/out/persistence/mongo-search-index.repository.js';

const isTest = () => process.env.NODE_ENV === 'test';

@Module({
  controllers: [SearchController, InternalController, HealthController],
  providers: [
    {
      provide: SEARCH_INDEX_REPOSITORY,
      useFactory: (): SearchIndexRepository =>
        isTest()
          ? new InMemorySearchIndexRepository()
          : new MongoSearchIndexRepository(
              process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27022/univalle_search',
            ),
    },
    {
      provide: CATALOG_SOURCE,
      useFactory: (): CatalogSource =>
        new HttpCatalogSource(process.env.CATALOG_SERVICE_URL ?? 'http://localhost:3005'),
    },
    {
      provide: SearchItems,
      useFactory: (index: SearchIndexRepository) => new SearchItems(index),
      inject: [SEARCH_INDEX_REPOSITORY],
    },
    {
      provide: ReindexCatalog,
      useFactory: (source: CatalogSource, index: SearchIndexRepository) =>
        new ReindexCatalog(source, index),
      inject: [CATALOG_SOURCE, SEARCH_INDEX_REPOSITORY],
    },
    {
      provide: ReindexScheduler,
      useFactory: (reindex: ReindexCatalog) =>
        new ReindexScheduler(reindex, {
          onStartup: !isTest() && process.env.REINDEX_ON_STARTUP !== 'false',
          intervalMinutes: isTest() ? 0 : Number(process.env.REINDEX_INTERVAL_MINUTES ?? 0) || 0,
        }),
      inject: [ReindexCatalog],
    },
    InternalApiKeyGuard,
  ],
})
export class SearchModule {}