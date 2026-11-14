import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { IndexProductUseCase } from '../src/search/application/use-cases/index-product.use-case.js';
import { RemoveIndexedProductUseCase } from '../src/search/application/use-cases/remove-indexed-product.use-case.js';
import { SearchProductsUseCase } from '../src/search/application/use-cases/search-products.use-case.js';
import { ProductIndexController } from '../src/search/infrastructure/http/product-index.controller.js';
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
      controllers: [SearchController, ProductIndexController],
      providers: [
        { provide: SearchProductsUseCase, useValue: searchProducts },
        { provide: IndexProductUseCase, useValue: { execute: vi.fn() } },
        {
          provide: RemoveIndexedProductUseCase,
          useValue: { execute: vi.fn() },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Univalle Shop - API de búsqueda')
      .setVersion('1.0.0')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      jsonDocumentUrl: 'api/docs-json',
    });
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

  it('publishes preloaded request examples in the OpenAPI document', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    const productExample =
      response.body.paths['/internal/search/products/{productId}'].put
        .requestBody.content['application/json'].examples.cuaderno.value;

    expect(productExample).toEqual({
      name: 'Cuaderno universitario',
      description: 'Cuaderno de 100 hojas para uso académico.',
      category: 'Papelería',
      price: 12000,
      imageUrl: 'https://example.com/cuaderno.jpg',
      isActive: true,
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
