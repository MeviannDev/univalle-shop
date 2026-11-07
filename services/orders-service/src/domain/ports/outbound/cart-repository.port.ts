import type { Cart } from '../../entities/cart.js';
import type { UserId } from '../../value-objects/user-id.js';

export const CART_REPOSITORY = Symbol('CART_REPOSITORY');

export interface CartRepository {
  findActiveByUserId(userId: UserId): Promise<Cart | null>;
  save(cart: Cart): Promise<void>;
}
