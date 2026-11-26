import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DomainExceptionFilter } from '../src/common/filters/domain-exception.filter.js';
import { PaymentModule } from '../src/modules/payments/payment.module.js';

describe('Payments HTTP API', () => {
  let app: INestApplication<App>;
  let mongo: MongoMemoryServer;
  const previousEnvironment = new Map<string, string | undefined>();
  const env = {
    MONGODB_URI: 'MONGODB_URI',
    MONGODB_DATABASE: 'MONGODB_DATABASE',
    INTERNAL_SERVICE_API_KEY: 'INTERNAL_SERVICE_API_KEY',
    PAYMENT_CALLBACK_ENABLED: 'PAYMENT_CALLBACK_ENABLED',
    PAYMENT_SIMULATION_RESULT: 'PAYMENT_SIMULATION_RESULT',
  } as const;

  beforeAll(async () => {
    for (const key of Object.values(env)) {
      previousEnvironment.set(key, process.env[key]);
    }
    mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri();
    process.env.MONGODB_DATABASE = 'payments_http_test';
    process.env.INTERNAL_SERVICE_API_KEY =
      'test-internal-key-that-is-at-least-32-bytes';
    process.env.PAYMENT_CALLBACK_ENABLED = 'false';
    process.env.PAYMENT_SIMULATION_RESULT = 'approved';

    const moduleRef = await Test.createTestingModule({
      imports: [PaymentModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await mongo?.stop();
    for (const key of Object.values(env)) {
      const value = previousEnvironment.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('requires internal authentication and an idempotency key', async () => {
    await request(app.getHttpServer())
      .post('/payments/simulate')
      .send(createBody())
      .expect(401);

    await request(app.getHttpServer())
      .post('/payments/simulate')
      .set('X-Internal-Api-Key', process.env.INTERNAL_SERVICE_API_KEY!)
      .send(createBody())
      .expect(400);
  });

  it('creates and replays a payment, rejecting idempotency-key payload changes', async () => {
    const first = await request(app.getHttpServer())
      .post('/payments/simulate')
      .set('X-Internal-Api-Key', process.env.INTERNAL_SERVICE_API_KEY!)
      .set('Idempotency-Key', 'checkout-api-key')
      .send(createBody())
      .expect(201);
    const replay = await request(app.getHttpServer())
      .post('/payments/simulate')
      .set('X-Internal-Api-Key', process.env.INTERNAL_SERVICE_API_KEY!)
      .set('Idempotency-Key', 'checkout-api-key')
      .send(createBody())
      .expect(201);

    expect(first.body).toMatchObject({
      orderId: 'order-api',
      status: 'approved',
    });
    expect(replay.body.id).toBe(first.body.id);

    await request(app.getHttpServer())
      .post('/payments/simulate')
      .set('X-Internal-Api-Key', process.env.INTERNAL_SERVICE_API_KEY!)
      .set('Idempotency-Key', 'checkout-api-key')
      .send(createBody({ amount: 125001 }))
      .expect(409);

    const cancelled = await request(app.getHttpServer())
      .post(`/payments/${first.body.id}/cancel`)
      .set('X-Internal-Api-Key', process.env.INTERNAL_SERVICE_API_KEY!)
      .set('Idempotency-Key', 'cancel-api-key')
      .send({ orderId: 'order-api' })
      .expect(200);
    expect(cancelled.body.status).toBe('refunded');
  });
});

function createBody(overrides: Record<string, unknown> = {}) {
  return {
    orderId: 'order-api',
    userId: 'user-api',
    amount: 125000,
    currency: 'COP',
    method: 'card',
    ...overrides,
  };
}
