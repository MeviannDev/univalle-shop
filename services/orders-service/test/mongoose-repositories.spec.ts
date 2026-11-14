import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createConnection, type Connection, type Model } from 'mongoose';
import { MongooseCartRepository } from '../src/infrastructure/persistence/repositories/mongoose-cart.repository.js';
import { MongooseOrderRepository } from '../src/infrastructure/persistence/repositories/mongoose-order.repository.js';
import { CartMongooseSchema, CartSchema } from '../src/infrastructure/persistence/schemas/cart.schema.js';
import { OrderMongooseSchema, OrderSchema } from '../src/infrastructure/persistence/schemas/order.schema.js';
import {
  PaymentEventMongooseSchema,
  PaymentEventSchema,
} from '../src/infrastructure/persistence/schemas/payment-event.schema.js';
import { Cart } from '../src/domain/entities/cart.js';
import { CartItem } from '../src/domain/entities/cart-item.js';
import { Order } from '../src/domain/entities/order.js';
import { CartId } from '../src/domain/value-objects/cart-id.js';
import { Money } from '../src/domain/value-objects/money.js';
import { OrderId } from '../src/domain/value-objects/order-id.js';
import { ProductId } from '../src/domain/value-objects/product-id.js';
import { Quantity } from '../src/domain/value-objects/quantity.js';
import { UserId } from '../src/domain/value-objects/user-id.js';

describe('Mongoose repositories against MongoDB replica set', () => {
  let replicaSet: MongoMemoryReplSet;
  let connection: Connection;
  let cartRepository: MongooseCartRepository;
  let orderRepository: MongooseOrderRepository;
  let cartModel: Model<CartSchema>;
  let orderModel: Model<OrderSchema>;
  let eventModel: Model<PaymentEventSchema>;

  beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    connection = await createConnection(replicaSet.getUri(), {
      dbName: 'orders_repository_tests',
    }).asPromise();
    cartModel = connection.model(CartSchema.name, CartMongooseSchema);
    orderModel = connection.model(OrderSchema.name, OrderMongooseSchema);
    eventModel = connection.model(PaymentEventSchema.name, PaymentEventMongooseSchema);
    await Promise.all([cartModel.init(), orderModel.init(), eventModel.init()]);
    cartRepository = new MongooseCartRepository(cartModel);
    orderRepository = new MongooseOrderRepository(orderModel, eventModel, connection);
  }, 120_000);

  afterAll(async () => {
    await connection?.close();
    await replicaSet?.stop();
  });

  beforeEach(async () => {
    await Promise.all([
      cartModel.deleteMany({}),
      orderModel.deleteMany({}),
      eventModel.deleteMany({}),
    ]);
  });

  it('mantiene un solo carrito por usuario', async () => {
    const userId = new UserId('customer-1');
    await cartRepository.save(new Cart(new CartId('cart-1'), userId));
    await cartRepository.save(new Cart(new CartId('cart-2'), userId));
    expect(await cartModel.countDocuments({ userId: userId.value })).toBe(1);
    expect((await cartRepository.findActiveByUserId(userId))?.id.value).toBe('cart-1');
  });

  it('garantiza una orden para una clave idempotente bajo solicitudes concurrentes', async () => {
    const userId = new UserId('customer-1');
    const order1 = Order.createFromCart(
      new OrderId('order-1'),
      cartFor(userId),
      new Date('2026-03-01T10:00:00.000Z'),
    );
    const order2 = Order.createFromCart(
      new OrderId('order-2'),
      cartFor(userId),
      new Date('2026-03-01T10:00:01.000Z'),
    );
    const results = await Promise.all([
      orderRepository.saveIfAbsentByIdempotencyKey(order1, 'same-key'),
      orderRepository.saveIfAbsentByIdempotencyKey(order2, 'same-key'),
    ]);
    expect(results.filter((result) => result.created)).toHaveLength(1);
    expect(await orderModel.countDocuments({ userId: userId.value })).toBe(1);
    expect(await orderRepository.findByIdempotencyKey(userId, 'same-key')).not.toBeNull();
  });

  it('deduplica eventId de pago con índice único y transacción', async () => {
    const userId = new UserId('customer-1');
    const order = Order.createFromCart(new OrderId('order-payment'), cartFor(userId));
    order.setPaymentId('payment-1');
    order.markAsPaid();
    order.recordPaymentEvent('event-1');
    await orderRepository.save(order);

    expect(await orderRepository.savePaymentResultOnce(order, 'event-1')).toBe(true);
    expect(await orderRepository.savePaymentResultOnce(order, 'event-1')).toBe(false);
    expect(await eventModel.countDocuments({ eventId: 'event-1' })).toBe(1);
  });

  it('pagina resultados y aplica filtro de estado y usuario', async () => {
    const firstUser = new UserId('customer-1');
    const secondUser = new UserId('customer-2');
    const first = Order.createFromCart(
      new OrderId('order-first'),
      cartFor(firstUser),
      new Date('2026-03-01T10:00:00.000Z'),
    );
    const second = Order.createFromCart(
      new OrderId('order-second'),
      cartFor(firstUser),
      new Date('2026-03-02T10:00:00.000Z'),
    );
    const third = Order.createFromCart(
      new OrderId('order-third'),
      cartFor(secondUser),
      new Date('2026-03-03T10:00:00.000Z'),
    );
    second.markAsPaid();
    await Promise.all([orderRepository.save(first), orderRepository.save(second), orderRepository.save(third)]);

    const page = await orderRepository.listByUser(
      firstUser,
      { status: 'PENDING_PAYMENT' },
      { page: 1, limit: 1 },
    );
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.id.value).toBe(first.id.value);
    expect(page.totalItems).toBe(1);
    const all = await orderRepository.listAll({}, { page: 1, limit: 2 });
    expect(all.items).toHaveLength(2);
    expect(all.totalItems).toBe(3);
    expect(all.totalPages).toBe(2);
  });
});

function cartFor(userId: UserId): Cart {
  return new Cart(new CartId(`cart-${userId.value}`), userId, [
    new CartItem(
      new ProductId('demo-notebook'),
      'Cuaderno Univalle',
      new Money(125_000, 'COP'),
      new Quantity(1),
    ),
  ]);
}
