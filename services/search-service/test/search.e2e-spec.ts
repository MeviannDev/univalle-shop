import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { AppModule } from '../src/app.module.js';
import { DomainExceptionFilter } from '../src/common/filters/domain-exception.filter.js';
import { CATALOG_SOURCE } from '../src/search/domain/ports/catalog-source.port.js';
import { CatalogUnavailableError } from '../src/search/domain/errors/domain-error.js';

let catalogDown = false;
const fakeCatalog = {
  fetchAll: async () => {
    if (catalogDown) throw new CatalogUnavailableError('simulado');
    return [
      { id: 'itm_1', kind: 'PRODUCT' as const, name: 'Cuaderno argollado', description: '100 hojas', category: 'papeleria', price: 5000, imageUrl: null },
      { id: 'itm_2', kind: 'SERVICE' as const, name: 'Tutoría de cálculo', description: '', category: 'tutorias', price: 30000, imageUrl: null },
    ];
  },
};

describe('Search service (e2e)', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    process.env.INTERNAL_API_KEY = 'test-key';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CATALOG_SOURCE)
      .useValue(fakeCatalog)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
  });

  afterAll(() => app.close());

  it('GET /health', async () => {
    await request(app.getHttpServer()).get('/health').expect(200, { status: 'ok', service: 'search-service' });
  });

  it('POST /internal/reindex exige la API key', async () => {
    await request(app.getHttpServer()).post('/internal/reindex').expect(401);
    await request(app.getHttpServer()).post('/internal/reindex').set('x-internal-api-key', 'mala').expect(401);
  });

  it('el catálogo caído responde 502', async () => {
    catalogDown = true;
    await request(app.getHttpServer()).post('/internal/reindex').set('x-internal-api-key', 'test-key').expect(502);
    catalogDown = false;
  });

  it('reindexa y luego busca', async () => {
    const http = app.getHttpServer();
    await request(http).post('/internal/reindex').set('x-internal-api-key', 'test-key').expect(200, { indexed: 2 });

    const res = await request(http).get('/search').query({ q: 'cuaderno' }).expect(200);
    expect(res.body).toMatchObject({ page: 1, limit: 20, total: 1, totalPages: 1 });
    expect(res.body.data[0].id).toBe('itm_1');

    const byKind = await request(http).get('/search').query({ q: 'calculo', kind: 'SERVICE' }).expect(200);
    expect(byKind.body.data.map((i: { id: string }) => i.id)).toEqual(['itm_2']);
  });

  it('valida la consulta con 400', async () => {
    const http = app.getHttpServer();
    await request(http).get('/search').expect(400);
    await request(http).get('/search').query({ q: 'x', kind: 'OTRO' }).expect(400);
    await request(http).get('/search').query({ q: 'x', limit: 999 }).expect(400);
    await request(http).get('/search').query({ q: 'x', page: 'abc' }).expect(400);
    await request(http).get('/search').query({ q: 'x', raro: '1' }).expect(400);
  });
});