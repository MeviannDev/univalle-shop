import type { Cart } from '../../../domain/entities/cart.js';
import type { Order } from '../../../domain/entities/order.js';
import type { Page } from '../../../domain/ports/outbound/order-repository.port.js';

function money(value: { amount: number; currency: string }) {
  return { amount: value.amount, currency: value.currency };
}

export function presentCart(cart: Cart) {
  return {
    id: cart.id.value,
    userId: cart.userId.value,
    items: cart.items.map((item) => ({
      productId: item.productId.value,
      name: item.name,
      unitPrice: money(item.unitPrice),
      quantity: item.quantity.value,
      subtotal: money(item.subtotal),
    })),
    total: money(cart.total),
    createdAt: cart.createdAt.toISOString(),
    updatedAt: cart.updatedAt.toISOString(),
  };
}

export function presentOrder(order: Order) {
  return {
    id: order.id.value,
    userId: order.userId.value,
    status: order.status.value,
    items: order.items.map((item) => ({
      productId: item.productId.value,
      name: item.name,
      unitPrice: money(item.unitPrice),
      quantity: item.quantity.value,
      subtotal: money(item.subtotal),
    })),
    total: money(order.total),
    paymentId: order.paymentId,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    statusHistory: order.statusHistory.map((entry) => ({
      ...entry,
      at: entry.at.toISOString(),
    })),
  };
}

export function presentPage<T>(
  page: Page<T>,
  present: (item: T) => unknown,
) {
  return {
    items: page.items.map(present),
    page: page.page,
    limit: page.limit,
    totalItems: page.totalItems,
    totalPages: page.totalPages,
  };
}
