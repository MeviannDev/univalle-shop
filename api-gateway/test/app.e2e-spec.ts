import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { vi } from 'vitest';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('forwards catalog requests through /products', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ id: 'product-1' }]), {
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await request(app.getHttpServer())
      .get('/products?category=Papeler%C3%ADa')
      .expect(200)
      .expect([{ id: 'product-1' }]);

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:3006/products?category=Papeler%C3%ADa'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('forwards search requests through /search', async () => {
    const results = {
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(results), {
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await request(app.getHttpServer())
      .get('/search?q=cuaderno&page=1&limit=20')
      .expect(200)
      .expect(results);

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:3007/search?q=cuaderno&page=1&limit=20'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await app.close();
  });
});
