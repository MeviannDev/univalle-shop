import { ProductSearchRepository } from '../ports/product-search.repository.js';
import { SearchProductsUseCase } from './search-products.use-case.js';

describe('SearchProductsUseCase', () => {
  it('calculates the offset and returns paginated search results', async () => {
    const search = vi.fn().mockResolvedValue({ items: [], total: 45 });
    const repository: ProductSearchRepository = {
      search,
      index: vi.fn(),
      remove: vi.fn(),
    };
    const useCase = new SearchProductsUseCase(repository);

    const result = await useCase.execute({
      query: 'cuaderno',
      page: 3,
      limit: 10,
    });

    expect(search).toHaveBeenCalledWith('cuaderno', 20, 10);
    expect(result).toEqual({
      items: [],
      total: 45,
      page: 3,
      limit: 10,
      totalPages: 5,
    });
  });
});
