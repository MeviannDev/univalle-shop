import { describe, expect, it } from 'vitest';
import { AddItemToCart } from '../src/application/use-cases/cart/add-item-to-cart.use-case.js';
import { ClearCart } from '../src/application/use-cases/cart/clear-cart.use-case.js';
import { GetCart } from '../src/application/use-cases/cart/get-cart.use-case.js';
import { RemoveItemFromCart } from '../src/application/use-cases/cart/remove-item-from-cart.use-case.js';
import { UpdateCartItemQuantity } from '../src/application/use-cases/cart/update-cart-item-quantity.use-case.js';
import { UpdateOrderStatusAdmin } from '../src/application/use-cases/admin/update-order-status-admin.use-case.js';
import { ApplyPaymentResult } from '../src/application/use-cases/orders/apply-payment-result.use-case.js';
import { CancelOrder } from '../src/application/use-cases/orders/cancel-order.use-case.js';
import { CreateOrderFromCart } from '../src/application/use-cases/orders/create-order-from-cart.use-case.js';
import { GetOrderById } from '../src/application/use-cases/orders/get-order-by-id.use-case.js';
import { ListOrdersAdmin } from '../src/application/use-cases/orders/list-orders-admin.use-case.js';
import { ListUserOrders } from '../src/application/use-cases/orders/list-user-orders.use-case.js';
import {
  CartItemNotFoundError,
  ExternalServiceUnavailableError,
  ForbiddenAccessError,
  ForbiddenOrderAccessError,
  InvalidPaginationError,
  OrderNotFoundError,
  ProductUnavailableError,
  UnauthorizedError,
} from '../src/application/errors/index.js';
import { Cart } from '../src/domain/entities/cart.js';
import { CartItem } from '../src/domain/entities/cart-item.js';
import { Order } from '../src/domain/entities/order.js';
import { CartId } from '../src/domain/value-objects/cart-id.js';
import { Money } from '../src/domain/value-objects/money.js';
import { OrderId } from '../src/domain/value-objects/order-id.js';
import { ProductId } from '../src/domain/value-objects/product-id.js';
import { Quantity } from '../src/domain/value-objects/quantity.js';
import { UserId } from '../src/domain/value-objects/user-id.js';
import {
  FakeCatalogService,
  FakeClock,
  FakeIdGenerator,
  FakePaymentService,
  FakeUsersService,
  InMemoryCartRepository,
  InMemoryOrderRepository,
} from './doubles/in-memory-adapters.js';

const userId = new UserId('user-1');
const productId = new ProductId('product-1');

function createCart(items = [new CartItem(productId, 'Producto 1', new Money(1_000, 'COP'), new Quantity(2))]) {
  return new Cart(new CartId('cart-seed'), userId, items);
}

function fixture() {
  const carts = new InMemoryCartRepository();
  const orders = new InMemoryOrderRepository();
  const catalog = new FakeCatalogService();
  catalog.addProduct(productId.value, 10, new Money(1_500, 'COP'));
  const payments = new FakePaymentService();
  const users = new FakeUsersService();
  const ids = new FakeIdGenerator();
  const clock = new FakeClock();
  const checkout = new CreateOrderFromCart(carts, orders, catalog, payments, ids, clock, users);
  return { carts, orders, catalog, payments, users, ids, clock, checkout };
}

async function seedOrder(
  state: ReturnType<typeof fixture>,
  id = 'order-seed',
  status?: 'PAID',
): Promise<Order> {
  const order = Order.createFromCart(
    new OrderId(id),
    createCart(),
    state.clock.now(),
    userId.value,
  );
  order.addReservationId(`reservation-${id}`);
  if (status === 'PAID') {
    order.markAsPaid();
  }
  order.setPaymentId(`payment-${id}`);
  await state.orders.save(order);
  return order;
}

describe('casos de uso del carrito', () => {
  it('AddItemToCart valida Catálogo, stock y acumula cantidades', async () => {
    const state = fixture();
    const useCase = new AddItemToCart(
      state.carts,
      state.catalog,
      state.ids,
      state.clock,
      state.users,
    );
    const first = await useCase.execute({ token: 'valid', productId: productId.value, quantity: 2 });
    const second = await useCase.execute({ token: 'valid', productId: productId.value, quantity: 1 });
    expect(first.cart.items).toHaveLength(1);
    expect(second.cart.items[0]?.quantity.value).toBe(3);
    expect(second.cart.items[0]?.unitPrice.amount).toBe(1_500);
  });

  it('AddItemToCart rechaza stock insuficiente y reporta indisponibilidad de Catálogo', async () => {
    const state = fixture();
    const useCase = new AddItemToCart(
      state.carts,
      state.catalog,
      state.ids,
      state.clock,
      state.users,
    );
    await expect(
      useCase.execute({ token: 'valid', productId: productId.value, quantity: 11 }),
    ).rejects.toBeInstanceOf(ProductUnavailableError);
    state.catalog.failures.getProduct = new Error('timeout');
    await expect(
      useCase.execute({ token: 'valid', productId: productId.value, quantity: 1 }),
    ).rejects.toBeInstanceOf(ExternalServiceUnavailableError);
  });

  it('RemoveItemFromCart quita el producto y falla si no existe', async () => {
    const state = fixture();
    await state.carts.save(createCart());
    const useCase = new RemoveItemFromCart(state.carts, state.users);
    const result = await useCase.execute({ token: 'valid', productId: productId.value });
    expect(result.cart.isEmpty).toBe(true);
    await expect(
      useCase.execute({ token: 'valid', productId: productId.value }),
    ).rejects.toBeInstanceOf(CartItemNotFoundError);
  });

  it('UpdateCartItemQuantity valida stock y actualiza la cantidad', async () => {
    const state = fixture();
    await state.carts.save(createCart());
    const useCase = new UpdateCartItemQuantity(state.carts, state.catalog, state.users);
    const result = await useCase.execute({
      token: 'valid',
      productId: productId.value,
      quantity: 4,
    });
    expect(result.cart.items[0]?.quantity.value).toBe(4);
    await expect(
      useCase.execute({ token: 'valid', productId: productId.value, quantity: 11 }),
    ).rejects.toBeInstanceOf(ProductUnavailableError);
  });

  it('ClearCart vacía el carrito y GetCart crea uno vacío si falta', async () => {
    const state = fixture();
    await state.carts.save(createCart());
    const clear = new ClearCart(state.carts, state.ids, state.clock, state.users);
    expect((await clear.execute({ token: 'valid' })).cart.isEmpty).toBe(true);

    state.carts.carts.clear();
    const get = new GetCart(state.carts, state.ids, state.clock, state.users);
    const result = await get.execute({ token: 'valid' });
    expect(result.cart.isEmpty).toBe(true);
    expect(state.carts.carts.has(userId.value)).toBe(true);
  });
});

describe('checkout e idempotencia', () => {
  it('CreateOrderFromCart crea snapshot, inicia pago y limpia el carrito', async () => {
    const state = fixture();
    await state.carts.save(createCart());
    const result = await state.checkout.execute({ token: 'valid', idempotencyKey: 'checkout-1' });
    expect(result.order.total.amount).toBe(3_000);
    expect(result.order.items[0]?.unitPrice.amount).toBe(1_500);
    expect(result.order.reservationIds).toHaveLength(1);
    expect(result.order.status.value).toBe('PENDING_PAYMENT');
    expect(result.replayed).toBe(false);
    expect(state.payments.requests).toHaveLength(1);
    expect(state.carts.carts.get(userId.value)?.isEmpty).toBe(true);
  });

  it('CreateOrderFromCart devuelve la orden existente al repetir la clave', async () => {
    const state = fixture();
    await state.carts.save(createCart());
    const first = await state.checkout.execute({ token: 'valid', idempotencyKey: 'same-key' });
    const second = await state.checkout.execute({ token: 'valid', idempotencyKey: 'same-key' });
    expect(second.order.id.equals(first.order.id)).toBe(true);
    expect(second.replayed).toBe(true);
    expect(state.payments.requests).toHaveLength(1);
  });

  it('CreateOrderFromCart no crea orden si el stock no está disponible', async () => {
    const state = fixture();
    await state.carts.save(createCart());
    state.catalog.addProduct(productId.value, 1);
    await expect(
      state.checkout.execute({ token: 'valid', idempotencyKey: 'stock-key' }),
    ).rejects.toBeInstanceOf(ProductUnavailableError);
    expect(state.orders.orders.size).toBe(0);
    expect(state.catalog.reservations.size).toBe(0);
  });

  it('CreateOrderFromCart rechaza carrito vacío y claves inválidas', async () => {
    const state = fixture();
    await state.carts.save(createCart([]));
    await expect(
      state.checkout.execute({ token: 'valid', idempotencyKey: 'empty-cart' }),
    ).rejects.toThrow('carrito vacío');
    await expect(
      state.checkout.execute({ token: 'valid', idempotencyKey: ' ' }),
    ).rejects.toThrow();
    expect(state.orders.orders.size).toBe(0);
  });

  it('CreateOrderFromCart compensa reservas y restaura el carrito si Pagos falla', async () => {
    const state = fixture();
    await state.carts.save(createCart());
    state.payments.failure = new Error('Pagos timeout');
    await expect(
      state.checkout.execute({ token: 'valid', idempotencyKey: 'payment-failure' }),
    ).rejects.toBeInstanceOf(ExternalServiceUnavailableError);
    const order = [...state.orders.orders.values()][0];
    expect(order?.status.value).toBe('PAYMENT_FAILED');
    expect(state.catalog.products.get(productId.value)?.stock).toBe(10);
    expect(state.carts.carts.get(userId.value)?.items).toHaveLength(1);
  });

  it('CreateOrderFromCart compensa las reservas previas si Catálogo falla parcialmente', async () => {
    const state = fixture();
    const secondProductId = new ProductId('product-2');
    state.catalog.addProduct(secondProductId.value, 5);
    await state.carts.save(
      createCart([
        new CartItem(productId, 'Producto 1', new Money(1_000, 'COP'), new Quantity(2)),
        new CartItem(secondProductId, 'Producto 2', new Money(500, 'COP'), new Quantity(1)),
      ]),
    );
    state.catalog.failOnReservationNumber = 2;
    await expect(
      state.checkout.execute({ token: 'valid', idempotencyKey: 'catalog-failure' }),
    ).rejects.toBeInstanceOf(ExternalServiceUnavailableError);
    expect(state.catalog.products.get(productId.value)?.stock).toBe(10);
    expect(state.catalog.products.get(secondProductId.value)?.stock).toBe(5);
    expect(state.catalog.reservations.size).toBe(0);
    expect(state.orders.orders.size).toBe(0);
  });

  it('CreateOrderFromCart libera la reserva ante una carrera de checkout idempotente', async () => {
    const state = fixture();
    await state.carts.save(createCart());
    const concurrentOrder = await seedOrder(state, 'concurrent-order');
    state.orders.idempotency.set(`${userId.value}:race-key`, concurrentOrder.id.value);
    state.orders.saveIfAbsentByIdempotencyKey = async () => ({
      order: concurrentOrder,
      created: false,
    });

    const result = await state.checkout.execute({ token: 'valid', idempotencyKey: 'race-key' });
    expect(result.order).toBe(concurrentOrder);
    expect(result.replayed).toBe(true);
    expect(state.catalog.products.get(productId.value)?.stock).toBe(10);
    expect(state.catalog.reservations.size).toBe(0);
    expect(state.payments.requests).toHaveLength(0);
  });

  it('CreateOrderFromCart confirma inventario ante una respuesta síncrona aprobada', async () => {
    const state = fixture();
    await state.carts.save(createCart());
    state.payments.status = 'APPROVED';
    const result = await state.checkout.execute({
      token: 'valid',
      idempotencyKey: 'sync-approved',
    });
    expect(result.order.status.value).toBe('PAID');
    expect(state.catalog.reservations.size).toBe(0);
    expect(state.catalog.products.get(productId.value)?.stock).toBe(8);
    const callback = await new ApplyPaymentResult(state.orders, state.catalog).execute({
      result: {
        paymentId: result.order.paymentId!,
        orderId: result.order.id,
        result: 'APPROVED',
        eventId: 'sync-payment-callback',
      },
    });
    expect(callback.duplicate).toBe(true);
    expect(callback.order.status.value).toBe('PAID');
  });

  it('CreateOrderFromCart libera reservas si la persistencia idempotente falla', async () => {
    const state = fixture();
    await state.carts.save(createCart());
    state.orders.saveIfAbsentByIdempotencyKey = async () => {
      throw new Error('Mongo unavailable');
    };
    await expect(
      state.checkout.execute({ token: 'valid', idempotencyKey: 'repository-failure' }),
    ).rejects.toBeInstanceOf(ExternalServiceUnavailableError);
    expect(state.catalog.products.get(productId.value)?.stock).toBe(10);
    expect(state.catalog.reservations.size).toBe(0);
    expect(state.orders.orders.size).toBe(0);
  });
});

describe('casos de uso de órdenes', () => {
  it('GetOrderById permite al dueño y rechaza el acceso ajeno', async () => {
    const state = fixture();
    const order = await seedOrder(state);
    const useCase = new GetOrderById(state.orders, state.users);
    expect((await useCase.execute({ token: 'valid', orderId: order.id.value })).order).toBe(order);
    await expect(
      useCase.execute({ token: 'other-user-token', orderId: order.id.value }),
    ).rejects.toBeInstanceOf(ForbiddenOrderAccessError);
    await expect(
      useCase.execute({ token: 'valid', orderId: 'missing' }),
    ).rejects.toBeInstanceOf(OrderNotFoundError);
  });

  it('ListUserOrders filtra por usuario, estado y pagina resultados', async () => {
    const state = fixture();
    await seedOrder(state, 'order-a');
    await seedOrder(state, 'order-b');
    const otherUserId = new UserId('user-2');
    const otherUsersCart = new Cart(
      new CartId('cart-other'),
      otherUserId,
      [new CartItem(productId, 'Producto 1', new Money(1_000, 'COP'), new Quantity(1))],
    );
    await state.orders.save(
      Order.createFromCart(new OrderId('other-user-order'), otherUsersCart),
    );
    const useCase = new ListUserOrders(state.orders, state.users);
    const result = await useCase.execute({
      token: 'valid',
      filter: {},
      page: { page: 1, limit: 1 },
    });
    expect(result.items).toHaveLength(1);
    expect(result.totalItems).toBe(2);
    expect(result.totalPages).toBe(2);
    await expect(
      useCase.execute({ token: 'valid', filter: {}, page: { page: 0, limit: 20 } }),
    ).rejects.toBeInstanceOf(InvalidPaginationError);
  });

  it('CancelOrder libera inventario y permite al dueño cancelar', async () => {
    const state = fixture();
    const order = await seedOrder(state);
    const useCase = new CancelOrder(state.orders, state.catalog, state.payments, state.users);
    const result = await useCase.execute({ token: 'valid', orderId: order.id.value });
    expect(result.order.status.value).toBe('CANCELLED');
  });

  it('CancelOrder pide a Pagos cancelar o reembolsar antes de cerrar una orden pagada', async () => {
    const state = fixture();
    const order = await seedOrder(state, 'paid-cancel', 'PAID');
    const result = await new CancelOrder(
      state.orders,
      state.catalog,
      state.payments,
      state.users,
    ).execute({ token: 'valid', orderId: order.id.value });
    expect(result.order.status.value).toBe('CANCELLED');
    expect(state.payments.cancellationRequests).toEqual([order.paymentId]);
  });

  it('CancelOrder niega acceso a una orden ajena', async () => {
    const state = fixture();
    const order = await seedOrder(state);
    await expect(
      new CancelOrder(state.orders, state.catalog, state.payments, state.users).execute({
        token: 'other-user-token',
        orderId: order.id.value,
      }),
    ).rejects.toBeInstanceOf(ForbiddenOrderAccessError);
  });

  it('ApplyPaymentResult aplica el callback y trata el mismo evento como duplicado', async () => {
    const state = fixture();
    await state.carts.save(createCart());
    const checkout = await state.checkout.execute({ token: 'valid', idempotencyKey: 'apply-payment' });
    const useCase = new ApplyPaymentResult(state.orders, state.catalog);
    const event = {
      paymentId: checkout.order.paymentId!,
      orderId: checkout.order.id,
      result: 'APPROVED' as const,
      eventId: 'event-1',
    };
    const first = await useCase.execute({ result: event });
    const duplicate = await useCase.execute({ result: event });
    expect(first.order.status.value).toBe('PAID');
    expect(duplicate.duplicate).toBe(true);
  });

  it('ApplyPaymentResult libera stock ante rechazo y rechaza una referencia de pago ajena', async () => {
    const state = fixture();
    await state.carts.save(createCart());
    const checkout = await state.checkout.execute({ token: 'valid', idempotencyKey: 'rejected-payment' });
    const useCase = new ApplyPaymentResult(state.orders, state.catalog);
    await expect(
      useCase.execute({
        result: {
          paymentId: 'unrelated-payment',
          orderId: checkout.order.id,
          result: 'REJECTED',
          eventId: 'event-wrong-payment',
        },
      }),
    ).rejects.toThrow();
    const rejected = await useCase.execute({
      result: {
        paymentId: checkout.order.paymentId!,
        orderId: checkout.order.id,
        result: 'REJECTED',
        eventId: 'event-rejected',
      },
    });
    expect(rejected.order.status.value).toBe('PAYMENT_FAILED');
    expect(state.catalog.products.get(productId.value)?.stock).toBe(10);
  });
});

describe('casos de uso administrativos', () => {
  it('ListOrdersAdmin exige administrador y pagina todas las órdenes', async () => {
    const state = fixture();
    await seedOrder(state, 'admin-order-a');
    await seedOrder(state, 'admin-order-b');
    const useCase = new ListOrdersAdmin(state.orders, state.users);
    await expect(
      useCase.execute({ token: 'valid', filter: {}, page: { page: 1, limit: 10 } }),
    ).rejects.toBeInstanceOf(ForbiddenAccessError);
    const result = await useCase.execute({
      token: 'admin-token',
      filter: {},
      page: { page: 1, limit: 1 },
    });
    expect(result.items).toHaveLength(1);
    expect(result.totalItems).toBe(2);
  });

  it('UpdateOrderStatusAdmin valida rol y cambia el estado permitido', async () => {
    const state = fixture();
    const order = await seedOrder(state, 'admin-update', 'PAID');
    const useCase = new UpdateOrderStatusAdmin(
      state.orders,
      state.catalog,
      state.payments,
      state.users,
    );
    const result = await useCase.execute({
      token: 'admin-token',
      orderId: order.id.value,
      status: 'PROCESSING',
    });
    expect(result.order.status.value).toBe('PROCESSING');
    await expect(
      useCase.execute({
        token: 'valid',
        orderId: order.id.value,
        status: 'SHIPPED',
      }),
    ).rejects.toBeInstanceOf(ForbiddenAccessError);
  });
});

describe('fiabilidad de los fakes', () => {
  it('expone errores simulables de Usuarios y repositorios', async () => {
    const state = fixture();
    state.users.failure = new Error('Users unavailable');
    await expect(
      new GetCart(state.carts, state.ids, state.clock, state.users).execute({ token: 'valid' }),
    ).rejects.toBeInstanceOf(ExternalServiceUnavailableError);
    state.carts.failure = new Error('Mongo unavailable');
    state.users.failure = null;
    await expect(
      new GetCart(state.carts, state.ids, state.clock, state.users).execute({ token: 'valid' }),
    ).rejects.toBeInstanceOf(ExternalServiceUnavailableError);
    state.carts.failure = null;
    await expect(
      new GetCart(state.carts, state.ids, state.clock, state.users).execute({ token: 'invalid' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
