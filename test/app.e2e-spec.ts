import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { SearchProductsUseCase } from '../src/search/application/use-cases/search-products.use-case.js';
import { SearchController } from '../src/search/infrastructure/http/search.controller.js';

describe('SearchController (e2e)', () => {
  let app: INestApplication<App>;
  const searchProducts = {
    execute: vi.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    }),
  };

  beforeEach(async () => {
    searchProducts.execute.mockClear();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        { provide: SearchProductsUseCase, useValue: searchProducts },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('searches with defaults and returns a paginated response', async () => {
    await request(app.getHttpServer())
      .get('/search?q=cuaderno')
      .expect(200)
      .expect({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

    expect(searchProducts.execute).toHaveBeenCalledWith({
      query: 'cuaderno',
      page: 1,
      limit: 20,
    });
  });

  it('rejects invalid pagination', async () => {
    await request(app.getHttpServer())
      .get('/search?q=cuaderno&limit=101')
      .expect(400);

    expect(searchProducts.execute).not.toHaveBeenCalled();
  });

  afterEach(async () => {
    await app.close();
  });
});
