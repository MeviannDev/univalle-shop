import type { CartRepository } from '../../../domain/ports/outbound/cart-repository.port.js';
import type { CatalogServicePort } from '../../../domain/ports/outbound/catalog-service.port.js';
import type { ClockPort } from '../../../domain/ports/outbound/clock.port.js';
import type { IdGeneratorPort } from '../../../domain/ports/outbound/id-generator.port.js';
import type { OrderRepository } from '../../../domain/ports/outbound/order-repository.port.js';
import type { PaymentServicePort } from '../../../domain/ports/outbound/payment-service.port.js';
import type { UserServicePort } from '../../../domain/ports/outbound/user-service.port.js';
import { Cart } from '../../../domain/entities/cart.js';
import { CartItem } from '../../../domain/entities/cart-item.js';
import { Order } from '../../../domain/entities/order.js';
import { ProductId } from '../../../domain/value-objects/product-id.js';
import { Quantity } from '../../../domain/value-objects/quantity.js';
import { CompensationFailedError } from '../../errors/compensation-failed.error.js';
import { IdempotencyKeyError } from '../../errors/idempotency-key.error.js';
import { InvalidDependencyResponseError } from '../../errors/invalid-dependency-response.error.js';
import { ProductUnavailableError } from '../../errors/product-unavailable.error.js';
import { ApplyPaymentResult } from './apply-payment-result.use-case.js';
import { authenticate } from '../../shared/authorization.js';
import { callExternal, compensate } from '../../shared/external-call.js';
import { loadCart } from '../../shared/load-cart.js';

export type CreateOrderFromCartCommand = {
  token: string;
  idempotencyKey: string;
};

export type CreateOrderFromCartResult = {
  order: Order;
  replayed: boolean;
};

export class CreateOrderFromCart {
  constructor(
    private readonly carts: CartRepository,
    private readonly orders: OrderRepository,
    private readonly catalog: CatalogServicePort,
    private readonly payments: PaymentServicePort,
    private readonly ids: IdGeneratorPort,
    private readonly clock: ClockPort,
    private readonly users: UserServicePort,
  ) {}

  async execute(command: CreateOrderFromCartCommand): Promise<CreateOrderFromCartResult> {
    const user = await authenticate(this.users, command.token);
    if (!command.idempotencyKey.trim() || command.idempotencyKey.length > 128) {
      throw new IdempotencyKeyError();
    }

    const previous = await callExternal('Persistencia de órdenes', () =>
      this.orders.findByIdempotencyKey(user.userId, command.idempotencyKey),
    );
    if (previous) {
      if (
        previous.status.value === 'PENDING_PAYMENT' &&
        !previous.paymentId
      ) {
        return {
          order: await this.resumePendingCheckout(
            previous,
            command.idempotencyKey,
          ),
          replayed: true,
        };
      }
      return { order: previous, replayed: true };
    }

    const cart = await loadCart(this.carts, user.userId, false);
    const cartItems = cart.checkout();
    const snapshotCart = await this.createCheckoutSnapshot(cart);
    let order: Order | null = null;
    let orderPersisted = false;
    let clearedCart = false;
    let paymentStarted = false;

    try {
      order = Order.createFromCart(
        this.ids.nextOrderId(),
        snapshotCart,
        this.clock.now(),
        user.userId.value,
      );
      snapshotCart.items.forEach(() =>
        order!.addReservationId(this.ids.nextReservationId()),
      );

      const saved = await callExternal('Persistencia de órdenes', () =>
        this.orders.saveIfAbsentByIdempotencyKey(order!, command.idempotencyKey),
      );
      if (!saved.created) {
        if (
          saved.order.status.value === 'PENDING_PAYMENT' &&
          !saved.order.paymentId
        ) {
          return {
            order: await this.resumePendingCheckout(
              saved.order,
              command.idempotencyKey,
            ),
            replayed: true,
          };
        }
        return { order: saved.order, replayed: true };
      }
      order = saved.order;
      orderPersisted = true;

      await this.reserveOrderStock(order);
      cart.clear();
      clearedCart = true;
      await callExternal('Persistencia de carritos', () => this.carts.save(cart));

      paymentStarted = true;
      const payment = await callExternal('Pagos', () =>
        this.payments.startPayment({
          orderId: order!.id,
          userId: user.userId,
          amount: order!.total,
          idempotencyKey: command.idempotencyKey,
        }),
      );
      const applied = await this.applyPaymentResult(order, payment);
      order = applied;
      if (payment.status === 'REJECTED') {
        await this.restoreCart(cart, cartItems);
        clearedCart = false;
      }

      return { order, replayed: false };
    } catch (error) {
      if (orderPersisted) {
        if (clearedCart && !paymentStarted) {
          try {
            await this.restoreCart(cart, cartItems);
          } catch (restoreError) {
            throw new Error(
              `Checkout quedó pendiente y no se pudo restaurar el carrito: ${String(restoreError)}`,
              { cause: error },
            );
          }
        }
        throw error;
      }
      throw error;
    }
  }

  private async resumePendingCheckout(
    order: Order,
    idempotencyKey: string,
  ): Promise<Order> {
    await this.reserveOrderStock(order);
    const cart = await loadCart(
      this.carts,
      order.userId,
      true,
      this.ids,
      this.clock,
    );
    if (this.cartMatchesOrder(cart, order)) {
      cart.clear();
      await callExternal('Persistencia de carritos', () =>
        this.carts.save(cart),
      );
    }

    const payment = await callExternal('Pagos', () =>
      this.payments.startPayment({
        orderId: order.id,
        userId: order.userId,
        amount: order.total,
        idempotencyKey,
      }),
    );
    const updated = await this.applyPaymentResult(order, payment);
    if (payment.status === 'REJECTED') {
      const cart = await loadCart(
        this.carts,
        order.userId,
        true,
        this.ids,
        this.clock,
      );
      await this.restoreCart(cart, this.orderItemsAsCartItems(order));
    }
    return updated;
  }

  private async reserveOrderStock(order: Order): Promise<void> {
    if (order.reservationIds.length !== order.items.length) {
      throw new InvalidDependencyResponseError('Persistencia de órdenes');
    }
    try {
      for (const [index, item] of order.items.entries()) {
        const reservationId = order.reservationIds[index]!;
        const reservation = await callExternal('Catálogo', () =>
          this.catalog.reserveStock({
            reservationId,
            productId: item.productId,
            quantity: item.quantity,
          }),
        );
        if (reservation.reservationId !== reservationId) {
          throw new InvalidDependencyResponseError('Catálogo');
        }
        if (!reservation.reserved) {
          throw new ProductUnavailableError(item.productId.value);
        }
      }
    } catch (error) {
      if (!(error instanceof ProductUnavailableError)) throw error;
      const failures = await this.cancelReservations(order.reservationIds);
      if (failures.length > 0) {
        throw new CompensationFailedError(error, failures);
      }
      order.markPaymentFailed();
      await callExternal('Persistencia de órdenes', () =>
        this.orders.save(order),
      );
      throw error;
    }
  }

  private async cancelReservations(
    reservationIds: readonly string[],
  ): Promise<unknown[]> {
    const failures: unknown[] = [];
    for (const reservationId of reservationIds) {
      const failure = await compensate('Catálogo', () =>
        this.catalog.cancelStockReservation(reservationId),
      );
      if (failure) failures.push(failure);
    }
    return failures;
  }

  private cartMatchesOrder(cart: Cart, order: Order): boolean {
    return (
      cart.items.length === order.items.length &&
      order.items.every((orderItem) =>
        cart.items.some(
          (cartItem) =>
            cartItem.productId.equals(orderItem.productId) &&
            cartItem.name === orderItem.name &&
            cartItem.unitPrice.amount === orderItem.unitPrice.amount &&
            cartItem.unitPrice.currency === orderItem.unitPrice.currency &&
            cartItem.quantity.value === orderItem.quantity.value,
        ),
      )
    );
  }

  private orderItemsAsCartItems(order: Order): CartItem[] {
    return order.items.map(
      (item) =>
        new CartItem(
          item.productId,
          item.name,
          item.unitPrice,
          new Quantity(item.quantity.value, item.quantity.max),
        ),
    );
  }

  private async applyPaymentResult(
    order: Order,
    payment: Awaited<ReturnType<PaymentServicePort['startPayment']>>,
  ): Promise<Order> {
    const eventId =
      payment.eventId ?? `orders-sync:${payment.paymentId}:${payment.status}`;
    const result = await new ApplyPaymentResult(
      this.orders,
      this.catalog,
      this.payments,
    ).execute({
      result: {
        paymentId: payment.paymentId,
        orderId: order.id,
        result: payment.status,
        eventId,
      },
    });
    return result.order;
  }

  private async createCheckoutSnapshot(cart: Cart): Promise<Cart> {
    const items: CartItem[] = [];
    for (const item of cart.items) {
      const productId = new ProductId(item.productId.value);
      const product = await callExternal('Catálogo', () =>
        this.catalog.getProduct(productId),
      );
      if (!product.productId.equals(productId) || !product.name.trim()) {
        throw new InvalidDependencyResponseError('Catálogo');
      }
      const quantity = item.quantity;
      const availability = await callExternal('Catálogo', () =>
        this.catalog.checkAvailability(productId, quantity),
      );
      if (
        !product.available ||
        !availability.productId.equals(productId) ||
        !Number.isSafeInteger(availability.stock) ||
        !availability.available ||
        availability.stock < quantity.value
      ) {
        throw new ProductUnavailableError(productId.value);
      }
      items.push(
        new CartItem(product.productId, product.name, product.unitPrice, quantity),
      );
    }
    return new Cart(cart.id, cart.userId, items, cart.createdAt, this.clock.now());
  }

  private async restoreCart(
    cart: Cart,
    items: ReturnType<Cart['checkout']>,
  ): Promise<void> {
    const restored = new Cart(
      cart.id,
      cart.userId,
      items.map(
        (item) =>
          new CartItem(
            item.productId,
            item.name,
            item.unitPrice,
            new Quantity(item.quantity.value, item.quantity.max),
          ),
      ),
      cart.createdAt,
      this.clock.now(),
    );
    await callExternal('Persistencia de carritos', () => this.carts.save(restored));
  }

}
