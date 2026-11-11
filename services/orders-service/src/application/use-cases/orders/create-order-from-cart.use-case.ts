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
      return { order: previous, replayed: true };
    }

    const cart = await loadCart(this.carts, user.userId, false);
    const cartItems = cart.checkout();
    const snapshotCart = await this.createCheckoutSnapshot(cart);
    const reservationIds: string[] = [];
    let order: Order | null = null;
    let orderPersisted = false;
    let clearedCart = false;

    try {
      for (const item of snapshotCart.items) {
        const reservationId = this.ids.nextReservationId();
        reservationIds.push(reservationId);
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

      order = Order.createFromCart(
        this.ids.nextOrderId(),
        snapshotCart,
        this.clock.now(),
        user.userId.value,
      );
      reservationIds.forEach((reservationId) => order!.addReservationId(reservationId));

      const saved = await callExternal('Persistencia de órdenes', () =>
        this.orders.saveIfAbsentByIdempotencyKey(order!, command.idempotencyKey),
      );
      if (!saved.created) {
        const failures = await this.releaseReservations(reservationIds);
        reservationIds.length = 0;
        order = null;
        if (failures.length > 0) {
          throw new CompensationFailedError(
            new Error('La clave idempotente ya estaba registrada'),
            failures,
          );
        }
        return { order: saved.order, replayed: true };
      }
      order = saved.order;
      orderPersisted = true;

      cart.clear();
      clearedCart = true;
      await callExternal('Persistencia de carritos', () => this.carts.save(cart));

      const payment = await callExternal('Pagos', () =>
        this.payments.startPayment({
          orderId: order!.id,
          userId: user.userId,
          amount: order!.total,
          idempotencyKey: command.idempotencyKey,
        }),
      );
      order.setPaymentId(payment.paymentId);

      if (payment.status === 'APPROVED') {
        for (const reservationId of reservationIds) {
          await callExternal('Catálogo', () => this.catalog.commitStock(reservationId));
        }
        order.markAsPaid();
      } else if (payment.status === 'REJECTED') {
        order.markPaymentFailed();
        const failures = await this.releaseReservations(reservationIds);
        if (failures.length > 0) {
          throw new CompensationFailedError(
            new Error('Pagos rechazó la transacción'),
            failures,
          );
        }
        await this.restoreCart(cart, cartItems);
        clearedCart = false;
      }

      await callExternal('Persistencia de órdenes', () => this.orders.save(order!));
      return { order, replayed: false };
    } catch (error) {
      const failures = await this.rollback(
        reservationIds,
        order,
        orderPersisted,
        clearedCart ? cart : null,
        cartItems,
      );
      if (failures.length > 0) {
        throw new CompensationFailedError(error, failures);
      }
      throw error;
    }
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

  private async releaseReservations(
    reservationIds: readonly string[],
  ): Promise<unknown[]> {
    const failures: unknown[] = [];
    for (const reservationId of reservationIds) {
      const failure = await compensate('Catálogo', () =>
        this.catalog.releaseStock(reservationId),
      );
      if (failure) {
        failures.push(failure);
      }
    }
    return failures;
  }

  private async rollback(
    reservationIds: readonly string[],
    order: Order | null,
    orderPersisted: boolean,
    cartToRestore: Cart | null,
    cartItems: ReturnType<Cart['checkout']>,
  ): Promise<unknown[]> {
    const failures = await this.releaseReservations(reservationIds);
    if (order && orderPersisted && order.status.value === 'PENDING_PAYMENT') {
      try {
        order.markPaymentFailed();
        await this.orders.save(order);
      } catch (error) {
        failures.push(error);
      }
    }
    if (cartToRestore) {
      const failure = await compensate('Persistencia de carritos', () =>
        this.restoreCart(cartToRestore, cartItems),
      );
      if (failure) {
        failures.push(failure);
      }
    }
    return failures;
  }
}
