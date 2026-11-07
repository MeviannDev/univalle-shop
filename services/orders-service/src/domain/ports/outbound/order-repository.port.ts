import type { Order } from '../../entities/order.js';
import type { OrderId } from '../../value-objects/order-id.js';
import type { OrderStatusValue } from '../../value-objects/order-status.js';
import type { UserId } from '../../value-objects/user-id.js';

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');

export type PageRequest = {
  page: number;
  limit: number;
};

export type OrderFilter = {
  status?: OrderStatusValue;
};

export type AdminOrderFilter = OrderFilter & {
  userId?: UserId;
};

export type Page<T> = {
  items: readonly T[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export interface OrderRepository {
  findById(id: OrderId): Promise<Order | null>;
  findByIdempotencyKey(userId: UserId, key: string): Promise<Order | null>;
  save(order: Order): Promise<void>;
  listByUser(userId: UserId, filter: OrderFilter, page: PageRequest): Promise<Page<Order>>;
  listAll(filter: AdminOrderFilter, page: PageRequest): Promise<Page<Order>>;
}
