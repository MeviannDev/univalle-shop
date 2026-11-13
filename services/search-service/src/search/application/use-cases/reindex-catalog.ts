import type { CatalogSource } from '../../domain/ports/catalog-source.port.js';
import type { SearchIndexRepository } from '../../domain/ports/search-index.repository.js';

export class ReindexCatalog {
  constructor(
    private readonly source: CatalogSource,
    private readonly index: SearchIndexRepository,
  ) {}

  async execute(): Promise<{ indexed: number }> {
    const items = await this.source.fetchAll();
    await this.index.replaceAll(items);
    return { indexed: items.length };
  }
}