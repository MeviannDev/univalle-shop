import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { APP_CONFIG } from '../src/config/app-config.js';

describe('API Gateway (e2e)', () => {
  let app: INestApplication;
  const fetchMock = vi.fn();

  beforeEach(async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 'order-1' }), {
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(APP_CONFIG)
      .useValue({
        port: 3000,
        usersServiceUrl: new URL('http://users.internal:3002'),
        ordersServiceUrl: new URL('http://orders.internal:3001/api'),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('GET /health returns process health', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it.each([
    ['/orders/order-1?expand=items', 'http://orders.internal:3001/api/orders/order-1?expand=items'],
    ['/cart/items', 'http://orders.internal:3001/api/cart/items'],
    ['/admin/orders', 'http://orders.internal:3001/api/admin/orders'],
  ])('forwards %s to Orders with its API prefix', async (path, targetUrl) => {
    await request(app.getHttpServer())
      .get(path)
      .set('Authorization', 'Bearer customer-token')
      .set('Idempotency-Key', 'checkout-key')
      .expect(200)
      .expect({ id: 'order-1' });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0].toString()).toBe(targetUrl);
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('authorization'),
    ).toBe('Bearer customer-token');
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('idempotency-key'),
    ).toBe('checkout-key');
  });

  it('blocks the payment-result callback through the Gateway', async () => {
    await request(app.getHttpServer())
      .post('/orders/order-1/payment-result')
      .set('X-Internal-Api-Key', 'invalid-key')
      .send({
        paymentId: 'payment-1',
        result: 'APPROVED',
        eventId: 'event-1',
      })
      .expect(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  afterEach(async () => {
    await app.close();
    vi.unstubAllGlobals();
  });
});
