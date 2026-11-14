import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { JwtTokenVerifier } from '../src/infrastructure/auth/jwt-token-verifier.js';
import { HttpExceptionFilter } from '../src/infrastructure/http/filters/http-exception.filter.js';
import { CartSchema } from '../src/infrastructure/persistence/schemas/cart.schema.js';
import { OrderSchema } from '../src/infrastructure/persistence/schemas/order.schema.js';
import { PaymentEventSchema } from '../src/infrastructure/persistence/schemas/payment-event.schema.js';

describe('Orders HTTP end-to-end', () => {
  let app: INestApplication;
  let replicaSet: MongoMemoryReplSet;
  let customerToken: string;
  let otherCustomerToken: string;
  let adminToken: string;
  let carts: Model<CartSchema>;
  let orders: Model<OrderSchema>;
  let events: Model<PaymentEventSchema>;
  let config: ConfigService;

  beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    process.env.NODE_ENV = 'test';
    process.env.MONGODB_URI = replicaSet.getUri();
    process.env.MONGODB_DATABASE = 'orders_e2e';
    process.env.JWT_SECRET = 'development-only-secret-change-before-deploy-32';
    process.env.INTERNAL_SERVICE_API_KEY = 'test-internal-api-key-change-before-use-123';
    process.env.USERS_ADAPTER = 'stub';
    process.env.CATALOG_ADAPTER = 'stub';
    process.env.PAYMENTS_ADAPTER = 'stub';
    process.env.STUB_PAYMENT_RESULT = 'PENDING';

    const { AppModule } = await import('../src/app.module.js');
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(app.get(HttpExceptionFilter));
    await app.init();

    const verifier = app.get(JwtTokenVerifier);
    customerToken = verifier.signDevelopmentToken('test-customer', 'CUSTOMER');
    otherCustomerToken = verifier.signDevelopmentToken('test-customer-2', 'CUSTOMER');
    adminToken = verifier.signDevelopmentToken('test-admin', 'ADMIN');
    config = app.get(ConfigService);
    carts = app.get<Model<CartSchema>>(getModelToken(CartSchema.name));
    orders = app.get<Model<OrderSchema>>(getModelToken(OrderSchema.name));
    events = app.get<Model<PaymentEventSchema>>(getModelToken(PaymentEventSchema.name));
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await replicaSet?.stop();
  });

  beforeEach(async () => {
    await Promise.all([carts.deleteMany({}), orders.deleteMany({}), events.deleteMany({})]);
    config.set('STUB_PAYMENT_RESULT', 'PENDING');
  });

  it('agrega, crea checkout, aplica pago aprobado y lista historial', async () => {
    const added = await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId: 'demo-notebook', quantity: 2 })
      .expect(201);
    expect(added.body.items[0].quantity).toBe(2);

    const checkout = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', 'e2e-approved')
      .send({})
      .expect(201);
    expect(checkout.body.status).toBe('PENDING_PAYMENT');

    const paid = await request(app.getHttpServer())
      .post(`/api/orders/${checkout.body.id}/payment-result`)
      .set('X-Internal-Api-Key', process.env.INTERNAL_SERVICE_API_KEY!)
      .send({
        paymentId: checkout.body.paymentId,
        result: 'APPROVED',
        eventId: 'e2e-event-approved',
      })
      .expect(200);
    expect(paid.body.status).toBe('PAID');

    const history = await request(app.getHttpServer())
      .get('/api/orders?page=1&limit=10')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(history.body.totalItems).toBe(1);
    expect(history.body.items[0].id).toBe(checkout.body.id);
  });

  it('rechaza un pago y compensa inventario restaurando el carrito', async () => {
    await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId: 'demo-notebook', quantity: 1 })
      .expect(201);
    config.set('STUB_PAYMENT_RESULT', 'REJECTED');
    const checkout = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', 'e2e-rejected')
      .send({})
      .expect(201);
    expect(checkout.body.status).toBe('PAYMENT_FAILED');
    const cart = await request(app.getHttpServer())
      .get('/api/cart')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(cart.body.items).toHaveLength(1);
  });

  it('checkout con la misma clave devuelve una sola orden', async () => {
    await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId: 'demo-notebook', quantity: 1 })
      .expect(201);
    const first = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', 'e2e-idempotent')
      .send({})
      .expect(201);
    const replay = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', 'e2e-idempotent')
      .send({})
      .expect(201);
    expect(replay.body.id).toBe(first.body.id);
    expect(await orders.countDocuments({ userId: 'test-customer' })).toBe(1);
  });

  it('protege órdenes ajenas, callback interno y rutas administrativas', async () => {
    await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId: 'demo-notebook', quantity: 1 })
      .expect(201);
    const checkout = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', 'e2e-forbidden')
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/orders/${checkout.body.id}`)
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/orders/${checkout.body.id}/payment-result`)
      .send({ paymentId: 'x', result: 'APPROVED', eventId: 'no-key' })
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/admin/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('responde 400 para cuerpos inválidos y 401 para JWT ausente', async () => {
    await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId: 'demo-notebook', quantity: 0 })
      .expect(400);
    await request(app.getHttpServer()).get('/api/cart').expect(401);
  });

  it('permite al administrador listar y transicionar órdenes válidamente', async () => {
    await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId: 'demo-notebook', quantity: 1 })
      .expect(201);
    const checkout = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', 'e2e-admin')
      .send({})
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/orders/${checkout.body.id}/payment-result`)
      .set('X-Internal-Api-Key', process.env.INTERNAL_SERVICE_API_KEY!)
      .send({
        paymentId: checkout.body.paymentId,
        result: 'APPROVED',
        eventId: 'e2e-admin-payment',
      })
      .expect(200);
    const result = await request(app.getHttpServer())
      .patch(`/api/admin/orders/${checkout.body.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PROCESSING' })
      .expect(200);
    expect(result.body.status).toBe('PROCESSING');
  });
});
