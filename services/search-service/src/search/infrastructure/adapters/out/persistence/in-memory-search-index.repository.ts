import type { SearchableItem } from '../../../../domain/entities/searchable-item.js';
import type {
  SearchIndexRepository,
  SearchResultPage,
} from '../../../../domain/ports/search-index.repository.js';
import type { SearchQuery } from '../../../../domain/value-objects/search-query.js';

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Índice en memoria para pruebas y desarrollo sin Mongo. Busca por palabras (cualquiera coincide). */
export class InMemorySearchIndexRepository implements SearchIndexRepository {
  private items = new Map<string, SearchableItem>();

  async search(query: SearchQuery): Promise<SearchResultPage> {
    const words = normalize(query.text).split(/\s+/).filter(Boolean);
    const scored = [...this.items.values()]
      .filter((item) => !query.kind || item.kind === query.kind)
      .filter((item) => !query.category || item.category === query.category)
      .map((item) => {
        const name = normalize(item.name);
        const rest = normalize(`${item.category} ${item.description}`);
        let score = 0;
        for (const word of words) {
          if (name.includes(word)) score += 10;
          else if (rest.includes(word)) score += 1;
        }
        return { item, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));

    const start = (query.page - 1) * query.limit;
    return {
      items: scored.slice(start, start + query.limit).map(({ item }) => item),
      total: scored.length,
    };
  }

  async replaceAll(items: SearchableItem[]): Promise<void> {
    this.items = new Map(items.map((item) => [item.id, item]));
  }
}