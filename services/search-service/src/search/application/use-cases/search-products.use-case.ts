import { ProductSearchRepository } from '../ports/product-search.repository.js';
import { SearchableProduct } from '../../domain/searchable-product.js';

export interface SearchProductsInput {
  query: string;
  page: number;
  limit: number;
}

export interface SearchProductsOutput {
  items: SearchableProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class SearchProductsUseCase {
  constructor(private readonly repository: ProductSearchRepository) {}

  async execute(input: SearchProductsInput): Promise<SearchProductsOutput> {
    const skip = (input.page - 1) * input.limit;
    const result = await this.repository.search(
      input.query,
      skip,
      input.limit,
    );

    return {
      ...result,
      page: input.page,
      limit: input.limit,
      totalPages: Math.ceil(result.total / input.limit),
    };
  }
}
