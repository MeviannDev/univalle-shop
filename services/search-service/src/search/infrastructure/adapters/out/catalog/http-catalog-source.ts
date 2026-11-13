import type { ItemKind, SearchableItem } from '../../../../domain/entities/searchable-item.js';
import { CatalogUnavailableError } from '../../../../domain/errors/domain-error.js';
import type { CatalogSource } from '../../../../domain/ports/catalog-source.port.js';

const PAGE_SIZE = 100;
const MAX_PAGES = 1000;
const TIMEOUT_MS = 10_000;

/**
 * Lee el catálogo por HTTP: GET {baseUrl}/products?page=N&limit=100
 * Respuesta esperada: { data: [...], totalPages: number }
 * Cada ítem: { id, name, description?, category, price, kind?, imageUrl? }
 */
export class HttpCatalogSource implements CatalogSource {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async fetchAll(): Promise<SearchableItem[]> {
    const items: SearchableItem[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const body = await this.getPage(page);
      for (const raw of body.data) {
        const item = toSearchableItem(raw);
        if (item) items.push(item);
      }
      totalPages = Number.isInteger(body.totalPages) ? (body.totalPages as number) : 1;
      page += 1;
    } while (page <= totalPages && page <= MAX_PAGES);
    return items;
  }

  private async getPage(page: number): Promise<{ data: unknown[]; totalPages?: unknown }> {
    const url = `${this.baseUrl.replace(/\/+$/, '')}/products?page=${page}&limit=${PAGE_SIZE}`;
    let response: Response;
    try {
      response = await this.fetchFn(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (error) {
      throw new CatalogUnavailableError(error instanceof Error ? error.message : 'sin respuesta');
    }
    if (!response.ok) throw new CatalogUnavailableError(`respondió ${response.status}`);

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new CatalogUnavailableError('la respuesta no es JSON');
    }
    const data = (body as { data?: unknown })?.data;
    if (!Array.isArray(data)) throw new CatalogUnavailableError('la respuesta no trae "data"');
    return { data, totalPages: (body as { totalPages?: unknown }).totalPages };
  }
}

function toSearchableItem(raw: unknown): SearchableItem | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const price =
    typeof r.price === 'number'
      ? r.price
      : typeof r.price === 'object' && r.price !== null
        ? (r.price as { amount?: unknown }).amount
        : undefined;
  if (
    typeof r.id !== 'string' ||
    typeof r.name !== 'string' ||
    typeof r.category !== 'string' ||
    typeof price !== 'number'
  ) {
    return null;
  }
  const kind: ItemKind = r.kind === 'SERVICE' ? 'SERVICE' : 'PRODUCT';
  return {
    id: r.id,
    kind,
    name: r.name,
    description: typeof r.description === 'string' ? r.description : '',
    category: r.category.trim().toLowerCase(),
    price,
    imageUrl: typeof r.imageUrl === 'string' ? r.imageUrl : null,
  };
}