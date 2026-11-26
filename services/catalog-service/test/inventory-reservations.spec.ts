import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose, { type Connection, type Model } from 'mongoose';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { CatalogModule } from '../src/catalog/catalog.module.js';
import { MongoInventoryReservationRepository } from '../src/catalog/infrastructure/persistence/mongo/mongo-inventory-reservation.repository.js';
import { InsufficientStockError } from '../src/catalog/domain/inventory-reservation.js';
import { ProductHasActiveReservationsError } from '../src/catalog/domain/product.js';
import { MongoProductRepository } from '../src/catalog/infrastructure/persistence/mongo/mongo-product.repository.js';
import {
  InventoryReservationMongoSchema,
  InventoryReservationSchema,
  type InventoryReservationDocument,
} from '../src/catalog/infrastructure/persistence/mongo/inventory-reservation.schema.js';
import {
  ProductMongoSchema,
  ProductSchema,
  type ProductDocument,
} from '../src/catalog/infrastructure/persistence/mongo/product.schema.js';

describe('MongoInventoryReservationRepository', () => {
  let replicaSet: MongoMemoryReplSet;
  let connection: Connection;
  let products: Model<ProductDocument>;
  let reservations: Model<InventoryReservationDocument>;
  let repository: MongoInventoryReservationRepository;
  let app: INestApplication<App>;
  let productId: string;
  let previousApiKey: string | undefined;

  beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
      replSet: { count: 1 },
    });
    previousApiKey = process.env.INTERNAL_SERVICE_API_KEY;
    process.env.INTERNAL_SERVICE_API_KEY =
      'test-internal-key-that-is-at-least-32-bytes';
    connection = await mongoose
      .createConnection(replicaSet.getUri())
      .asPromise();
    products = connection.model<ProductDocument>(
      ProductSchema.name,
      ProductMongoSchema,
    );
    reservations = connection.model<InventoryReservationDocument>(
      InventoryReservationSchema.name,
      InventoryReservationMongoSchema,
    );
    await Promise.all([products.init(), reservations.init()]);
    repository = new MongoInventoryReservationRepository(
      products,
      reservations,
      connection,
    );
    const moduleRef = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(replicaSet.getUri()), CatalogModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await connection?.close();
    await replicaSet?.stop();
    if (previousApiKey === undefined) {
      delete process.env.INTERNAL_SERVICE_API_KEY;
    } else {
      process.env.INTERNAL_SERVICE_API_KEY = previousApiKey;
    }
  });

  beforeEach(async () => {
    await Promise.all([
      products.deleteMany({}).exec(),
      reservations.deleteMany({}).exec(),
    ]);
    const product = await products.create({
      name: 'Producto de prueba',
      description: 'Producto para probar reserva concurrente.',
      price: 10000,
      category: 'Pruebas',
      images: [],
      stock: 4,
      reservedStock: 0,
      active: true,
    });
    productId = product._id.toString();
  });

  it('no oversells when reservations compete for the same stock', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, (_, index) =>
        repository.reserve({
          reservationId: `checkout-${index}`,
          productId,
          quantity: 1,
        }),
      ),
    );

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(4);
    const rejectedResults = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    expect(rejectedResults).toHaveLength(8);
    expect(
      rejectedResults.every(
        (result) => result.reason instanceof InsufficientStockError,
      ),
    ).toBe(true);

    const product = await products.findById(productId).lean().exec();
    expect(product?.stock).toBe(0);
    expect(product?.reservedStock).toBe(4);
  });

  it('replays concurrent requests with the same reservation id once', async () => {
    const input = {
      reservationId: 'checkout-idempotent',
      productId,
      quantity: 1,
    };
    const results = await Promise.all(
      Array.from({ length: 5 }, () => repository.reserve(input)),
    );

    expect(results.every((result) => result.status === 'RESERVED')).toBe(true);
    expect(await reservations.countDocuments()).toBe(1);
    const product = await products.findById(productId).lean().exec();
    expect(product?.stock).toBe(3);
    expect(product?.reservedStock).toBe(1);
  });

  it('releases stock once and makes commit idempotent', async () => {
    const { reservationId } = await repository.reserve({
      reservationId: 'checkout-transition',
      productId,
      quantity: 2,
    });

    expect(await repository.release(reservationId)).toEqual({
      reservationId,
      status: 'RELEASED',
    });
    await repository.release(reservationId);
    const releasedProduct = await products.findById(productId).lean().exec();
    expect(releasedProduct?.stock).toBe(4);
    expect(releasedProduct?.reservedStock).toBe(0);

    const committedReservationId = 'checkout-commit';
    await repository.reserve({
      reservationId: committedReservationId,
      productId,
      quantity: 2,
    });
    expect(await repository.commit(committedReservationId)).toEqual({
      reservationId: committedReservationId,
      status: 'COMMITTED',
    });
    expect(await repository.commit(committedReservationId)).toEqual({
      reservationId: committedReservationId,
      status: 'COMMITTED',
    });
    const committedProduct = await products.findById(productId).lean().exec();
    expect(committedProduct?.stock).toBe(2);
    expect(committedProduct?.reservedStock).toBe(0);
  });

  it('cancels reserved or committed stock idempotently', async () => {
    expect(await repository.cancel('missing-reservation')).toEqual({
      reservationId: 'missing-reservation',
      status: 'RELEASED',
    });

    await repository.reserve({
      reservationId: 'checkout-cancel-reserved',
      productId,
      quantity: 1,
    });
    expect(await repository.cancel('checkout-cancel-reserved')).toEqual({
      reservationId: 'checkout-cancel-reserved',
      status: 'RELEASED',
    });

    await repository.reserve({
      reservationId: 'checkout-cancel-committed',
      productId,
      quantity: 2,
    });
    await repository.commit('checkout-cancel-committed');
    expect(await repository.cancel('checkout-cancel-committed')).toEqual({
      reservationId: 'checkout-cancel-committed',
      status: 'RETURNED',
    });
    await repository.cancel('checkout-cancel-committed');

    const product = await products.findById(productId).lean().exec();
    expect(product?.stock).toBe(4);
    expect(product?.reservedStock).toBe(0);
    expect(
      await reservations.findOne({ reservationId: 'checkout-cancel-committed' }),
    ).toMatchObject({ status: 'RETURNED' });
  });

  it('prevents deleting a product while a reservation is active', async () => {
    const productsRepository = new MongoProductRepository(
      products,
      reservations,
    );
    await repository.reserve({
      reservationId: 'checkout-protected',
      productId,
      quantity: 1,
    });

    await expect(productsRepository.delete(productId)).rejects.toBeInstanceOf(
      ProductHasActiveReservationsError,
    );

    await repository.commit('checkout-protected');
    await expect(productsRepository.delete(productId)).rejects.toBeInstanceOf(
      ProductHasActiveReservationsError,
    );

    await repository.fulfill('checkout-protected');
    await expect(productsRepository.delete(productId)).resolves.toBe(true);
  });

  it('fulfills committed stock idempotently without changing availability', async () => {
    await repository.reserve({
      reservationId: 'checkout-fulfill',
      productId,
      quantity: 2,
    });
    await repository.commit('checkout-fulfill');

    expect(await repository.fulfill('checkout-fulfill')).toEqual({
      reservationId: 'checkout-fulfill',
      status: 'FULFILLED',
    });
    await repository.fulfill('checkout-fulfill');

    const product = await products.findById(productId).lean().exec();
    expect(product?.stock).toBe(2);
    expect(product?.reservedStock).toBe(0);
    await expect(repository.cancel('checkout-fulfill')).rejects.toThrow();
  });

  it('exposes an authenticated HTTP reservation endpoint with validation', async () => {
    const body = {
      reservationId: 'http-checkout',
      productId,
      quantity: 1,
    };

    await request(app.getHttpServer())
      .post('/inventory/reservations')
      .send(body)
      .expect(401);

    await request(app.getHttpServer())
      .post('/inventory/reservations')
      .set('X-Internal-Api-Key', process.env.INTERNAL_SERVICE_API_KEY!)
      .send({ ...body, quantity: 0 })
      .expect(400);

    await request(app.getHttpServer())
      .post('/inventory/reservations')
      .set('X-Internal-Api-Key', process.env.INTERNAL_SERVICE_API_KEY!)
      .send({ ...body, reservationId: 'http-out-of-stock', quantity: 5 })
      .expect(409);

    await request(app.getHttpServer())
      .post('/inventory/reservations')
      .set('X-Internal-Api-Key', process.env.INTERNAL_SERVICE_API_KEY!)
      .send(body)
      .expect(201)
      .expect(({ body: responseBody }) => {
        expect(responseBody).toMatchObject({
          reservationId: body.reservationId,
          productId,
          quantity: 1,
          status: 'RESERVED',
        });
      });

    await request(app.getHttpServer())
      .post(`/inventory/reservations/${body.reservationId}/cancel`)
      .set('X-Internal-Api-Key', process.env.INTERNAL_SERVICE_API_KEY!)
      .send({})
      .expect(200)
      .expect(({ body: responseBody }) => {
        expect(responseBody).toMatchObject({
          reservationId: body.reservationId,
          status: 'RELEASED',
        });
      });

    const committedReservationId = 'http-committed';
    await repository.reserve({
      reservationId: committedReservationId,
      productId,
      quantity: 1,
    });
    await repository.commit(committedReservationId);
    await request(app.getHttpServer())
      .post(`/inventory/reservations/${committedReservationId}/fulfill`)
      .set('X-Internal-Api-Key', process.env.INTERNAL_SERVICE_API_KEY!)
      .send({})
      .expect(200)
      .expect(({ body: responseBody }) => {
        expect(responseBody).toMatchObject({
          reservationId: committedReservationId,
          status: 'FULFILLED',
        });
      });
  });
});
