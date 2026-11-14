import type { CartRepository } from '../../src/domain/ports/outbound/cart-repository.port.js';
import type {
  Availability,
  CatalogServicePort,
  ProductSnapshot,
  ReservationResult,
  StockReservation,
} from '../../src/domain/ports/outbound/catalog-service.port.js';
import type { ClockPort } from '../../src/domain/ports/outbound/clock.port.js';
import type { IdGeneratorPort } from '../../src/domain/ports/outbound/id-generator.port.js';
import type {
  AdminOrderFilter,
  OrderFilter,
  OrderRepository,
  Page,
  PageRequest,
  SaveIdempotentOrderResult,
} from '../../src/domain/ports/outbound/order-repository.port.js';
import type {
  PaymentInitiated,
  PaymentServicePort,
  StartPaymentRequest,
} from '../../src/domain/ports/outbound/payment-service.port.js';
import type {
  AuthenticatedUser,
  UserServicePort,
  UserSummary,
} from '../../src/domain/ports/outbound/user-service.port.js';
import { Cart } from '../../src/domain/entities/cart.js';
import { Order } from '../../src/domain/entities/order.js';
import { InvalidUserTokenError } from '../../src/domain/errors/invalid-user-token.error.js';
import { CartId } from '../../src/domain/value-objects/cart-id.js';
import { Money } from '../../src/domain/value-objects/money.js';
import { OrderId } from '../../src/domain/value-objects/order-id.js';
import { ProductId } from '../../src/domain/value-objects/product-id.js';
import { UserId } from '../../src/domain/value-objects/user-id.js';

export class InMemoryCartRepository implements CartRepository {
  readonly carts = new Map<string, Cart>();
  failure: Error | null = null;

  async findActiveByUserId(userId: UserId): Promise<Cart | null> {
    this.throwIfFailed();
    return this.carts.get(userId.value) ?? null;
  }

  async save(cart: Cart): Promise<void> {
    this.throwIfFailed();
    this.carts.set(cart.userId.value, cart);
  }

  private throwIfFailed(): void {
    if (this.failure) {
      throw this.failure;
    }
  }
}

export class InMemoryOrderRepository implements OrderRepository {
  readonly orders = new Map<string, Order>();
  readonly idempotency = new Map<string, string>();
  readonly paymentEvents = new Set<string>();
  failure: Error | null = null;

  async findById(id: OrderId): Promise<Order | null> {
    this.throwIfFailed();
    return this.orders.get(id.value) ?? null;
  }

  async findByIdempotencyKey(userId: UserId, key: string): Promise<Order | null> {
    this.throwIfFailed();
    const id = this.idempotency.get(`${userId.value}:${key}`);
    return id ? this.orders.get(id) ?? null : null;
  }

  async save(order: Order): Promise<void> {
    this.throwIfFailed();
    this.orders.set(order.id.value, order);
  }

  async saveIfAbsentByIdempotencyKey(
    order: Order,
    key: string,
  ): Promise<SaveIdempotentOrderResult> {
    this.throwIfFailed();
    const compoundKey = `${order.userId.value}:${key}`;
    const existingId = this.idempotency.get(compoundKey);
    if (existingId) {
      return { order: this.orders.get(existingId)!, created: false };
    }
    this.idempotency.set(compoundKey, order.id.value);
    this.orders.set(order.id.value, order);
    return { order, created: true };
  }

  async savePaymentResultOnce(order: Order, eventId: string): Promise<boolean> {
    this.throwIfFailed();
    if (this.paymentEvents.has(eventId)) {
      return false;
    }
    this.paymentEvents.add(eventId);
    this.orders.set(order.id.value, order);
    return true;
  }

  async listByUser(
    userId: UserId,
    filter: OrderFilter,
    page: PageRequest,
  ): Promise<Page<Order>> {
    this.throwIfFailed();
    return this.paginate(
      [...this.orders.values()]
        .filter((order) => order.userId.equals(userId))
        .filter((order) => !filter.status || order.status.value === filter.status),
      page,
    );
  }

  async listAll(
    filter: AdminOrderFilter,
    page: PageRequest,
  ): Promise<Page<Order>> {
    this.throwIfFailed();
    return this.paginate(
      [...this.orders.values()]
        .filter((order) => !filter.userId || order.userId.equals(filter.userId))
        .filter((order) => !filter.status || order.status.value === filter.status),
      page,
    );
  }

  private paginate(orders: Order[], request: PageRequest): Page<Order> {
    const start = (request.page - 1) * request.limit;
    return {
      items: orders.slice(start, start + request.limit),
      page: request.page,
      limit: request.limit,
      totalItems: orders.length,
      totalPages: Math.ceil(orders.length / request.limit),
    };
  }

  private throwIfFailed(): void {
    if (this.failure) {
      throw this.failure;
    }
  }
}

export class FakeUsersService implements UserServicePort {
  failure: Error | null = null;
  readonly userId = new UserId('user-1');

  async validateToken(token: string): Promise<AuthenticatedUser> {
    if (this.failure) {
      throw this.failure;
    }
    if (!token || token === 'invalid') {
      throw new InvalidUserTokenError();
    }
    const role = token === 'admin-token' ? 'ADMIN' : 'CUSTOMER';
    const userId = token === 'other-user-token' ? new UserId('user-2') : this.userId;
    return {
      userId,
      role,
      active: token !== 'inactive-token',
      univalleAffiliation: 'STUDENT',
    };
  }

  async getBasicUser(userId: UserId): Promise<UserSummary> {
    if (this.failure) {
      throw this.failure;
    }
    return { userId, role: 'CUSTOMER', active: true };
  }
}

export class FakeCatalogService implements CatalogServicePort {
  readonly products = new Map<string, ProductSnapshot>();
  readonly reservations = new Map<string, StockReservation>();
  readonly failures: Partial<Record<'getProduct' | 'checkAvailability' | 'reserveStock' | 'releaseStock' | 'commitStock', Error>> = {};
  failReservation = false;
  failOnReservationNumber: number | null = null;
  private reservationCalls = 0;
  private committed: string[] = [];

  addProduct(
    productId: string,
    stock = 10,
    unitPrice = new Money(1_000, 'COP'),
    available = true,
  ): void {
    const snapshot: ProductSnapshot = {
      productId: new ProductId(productId),
      name: `Producto ${productId}`,
      unitPrice,
      available,
      stock,
    };
    this.products.set(productId, snapshot);
  }

  async getProduct(productId: ProductSnapshot['productId']): Promise<ProductSnapshot> {
    this.throwIfFailed('getProduct');
    const product = this.products.get(productId.value);
    if (!product) {
      throw new Error('Producto inexistente');
    }
    return product;
  }

  async checkAvailability(
    productId: ProductSnapshot['productId'],
    quantity: Parameters<CatalogServicePort['checkAvailability']>[1],
  ): Promise<Availability> {
    this.throwIfFailed('checkAvailability');
    const product = this.products.get(productId.value);
    return {
      productId,
      available: Boolean(product?.available && product.stock >= quantity.value),
      stock: product?.stock ?? 0,
    };
  }

  async reserveStock(reservation: StockReservation): Promise<ReservationResult> {
    this.reservationCalls += 1;
    this.throwIfFailed('reserveStock');
    if (this.reservationCalls === this.failOnReservationNumber) {
      throw new Error('Fallo de reserva simulado');
    }
    const product = this.products.get(reservation.productId.value);
    if (this.failReservation || !product || !product.available || product.stock < reservation.quantity.value) {
      return { reservationId: reservation.reservationId, reserved: false };
    }
    this.products.set(product.productId.value, {
      ...product,
      stock: product.stock - reservation.quantity.value,
    });
    this.reservations.set(reservation.reservationId, reservation);
    return { reservationId: reservation.reservationId, reserved: true };
  }

  async releaseStock(reservationId: string): Promise<void> {
    this.throwIfFailed('releaseStock');
    if (this.committed.includes(reservationId)) {
      return;
    }
    const reservation = this.reservations.get(reservationId);
    if (!reservation) {
      return;
    }
    const product = this.products.get(reservation.productId.value);
    if (product) {
      this.products.set(product.productId.value, {
        ...product,
        stock: product.stock + reservation.quantity.value,
      });
    }
    this.reservations.delete(reservationId);
  }

  async commitStock(reservationId: string): Promise<void> {
    this.throwIfFailed('commitStock');
    this.committed.push(reservationId);
    this.reservations.delete(reservationId);
  }

  private throwIfFailed(
    operation: keyof FakeCatalogService['failures'],
  ): void {
    const failure = this.failures[operation];
    if (failure) {
      throw failure;
    }
  }
}

export class FakePaymentService implements PaymentServicePort {
  failure: Error | null = null;
  status: PaymentInitiated['status'] = 'PENDING';
  readonly requests: StartPaymentRequest[] = [];
  readonly cancellationRequests: string[] = [];

  async startPayment(request: StartPaymentRequest): Promise<PaymentInitiated> {
    if (this.failure) {
      throw this.failure;
    }
    this.requests.push(request);
    return { paymentId: `payment-${this.requests.length}`, status: this.status };
  }

  async cancelOrRefundPayment(request: {
    paymentId: string;
    orderId: OrderId;
    idempotencyKey: string;
  }): Promise<void> {
    if (this.failure) {
      throw this.failure;
    }
    this.cancellationRequests.push(request.paymentId);
  }
}

export class FakeClock implements ClockPort {
  constructor(private readonly current = new Date('2026-02-01T10:00:00.000Z')) {}

  now(): Date {
    return new Date(this.current);
  }
}

export class FakeIdGenerator implements IdGeneratorPort {
  private cartCounter = 0;
  private orderCounter = 0;
  private reservationCounter = 0;

  nextCartId(): CartId {
    this.cartCounter += 1;
    return new CartId(`cart-${this.cartCounter}`);
  }

  nextOrderId(): OrderId {
    this.orderCounter += 1;
    return new OrderId(`order-${this.orderCounter}`);
  }

  nextReservationId(): string {
    this.reservationCounter += 1;
    return `reservation-${this.reservationCounter}`;
  }
}
