import type { ProductRepository } from '../ports/product.repository.js';
import { Product, ProductNotFoundError } from '../../domain/product.js';
import { GetProductUseCase } from './get-product.use-case.js';

describe('GetProductUseCase', () => {
  const productId = '507f1f77bcf86cd799439011';
  const product = new Product({
    id: productId,
    name: 'Cuaderno',
    description: 'Cuaderno universitario',
    price: 12000,
    category: 'Papelería',
    images: [],
    stock: 5,
  });

  it('returns the product from the repository', async () => {
    const repository: ProductRepository = {
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue(product),
      update: vi.fn(),
      delete: vi.fn(),
    };

    await expect(
      new GetProductUseCase(repository).execute(productId),
    ).resolves.toBe(product);
  });

  it('reports a missing product instead of returning an empty result', async () => {
    const repository: ProductRepository = {
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
      delete: vi.fn(),
    };

    await expect(
      new GetProductUseCase(repository).execute(productId),
    ).rejects.toBeInstanceOf(ProductNotFoundError);
  });
});
