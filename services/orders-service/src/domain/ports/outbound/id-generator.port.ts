import type { CartId } from '../../value-objects/cart-id.js';
import type { OrderId } from '../../value-objects/order-id.js';

export const ID_GENERATOR = Symbol('ID_GENERATOR');

export interface IdGeneratorPort {
  nextCartId(): CartId;
  nextOrderId(): OrderId;
  nextReservationId(): string;
}
