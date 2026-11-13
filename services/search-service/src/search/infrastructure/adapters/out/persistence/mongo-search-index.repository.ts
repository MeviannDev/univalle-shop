import { type Collection, MongoClient } from 'mongodb';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { SearchableItem } from '../../../../domain/entities/searchable-item.js';
import type {
  SearchIndexRepository,
  SearchResultPage,
} from '../../../../domain/ports/search-index.repository.js';
import type { SearchQuery } from '../../../../domain/value-objects/search-query.js';

const COLLECTION = 'search_items';
const BATCH_SIZE = 500;

export class MongoSearchIndexRepository
  implements SearchIndexRepository, OnModuleInit, OnModuleDestroy
{
  private readonly client: MongoClient;
  private items!: Collection<SearchableItem>;

  constructor(uri: string) {
    this.client = new MongoClient(uri);
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
    this.items = this.client.db().collection<SearchableItem>(COLLECTION);
    await this.items.createIndex({ id: 1 }, { unique: true, name: 'id_unique' });
    await this.items.createIndex({ kind: 1, category: 1 }, { name: 'kind_category' });
    // Índice de texto en español: ignora tildes y mayúsculas y reconoce plurales ("cuadernos" = "cuaderno").
    await this.items.createIndex(
      { name: 'text', category: 'text', description: 'text' },
      {
        name: 'search_text',
        default_language: 'spanish',
        weights: { name: 10, category: 3, description: 1 },
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }

  async search(query: SearchQuery): Promise<SearchResultPage> {
    const filter: Record<string, unknown> = { $text: { $search: query.text } };
    if (query.kind) filter.kind = query.kind;
    if (query.category) filter.category = query.category;

    const [docs, total] = await Promise.all([
      this.items
        .find(filter, { projection: { _id: 0, score: { $meta: 'textScore' } } })
        .sort({ score: { $meta: 'textScore' }, id: 1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .toArray(),
      this.items.countDocuments(filter),
    ]);

    const items = docs.map((doc) => {
      const { score: _score, ...item } = doc as SearchableItem & { score?: number };
      return item;
    });
    return { items, total };
  }

  async replaceAll(items: SearchableItem[]): Promise<void> {
    if (items.length === 0) {
      await this.items.deleteMany({});
      return;
    }
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      await this.items.bulkWrite(
        batch.map((item) => ({
          replaceOne: { filter: { id: item.id }, replacement: item, upsert: true },
        })),
        { ordered: false },
      );
    }
    await this.items.deleteMany({ id: { $nin: items.map((item) => item.id) } });
  }
}