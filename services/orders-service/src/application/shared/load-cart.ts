import type { CartRepository } from '../../domain/ports/outbound/cart-repository.port.js';
import type { ClockPort } from '../../domain/ports/outbound/clock.port.js';
import type { IdGeneratorPort } from '../../domain/ports/outbound/id-generator.port.js';
import type { UserId } from '../../domain/value-objects/user-id.js';
import { Cart } from '../../domain/entities/cart.js';
import { CartNotFoundError } from '../errors/cart-not-found.error.js';
import { callExternal } from './external-call.js';

export async function loadCart(
  carts: CartRepository,
  userId: UserId,
  createIfMissing: boolean,
  ids?: IdGeneratorPort,
  clock?: ClockPort,
): Promise<Cart> {
  const cart = await callExternal('Persistencia de carritos', () =>
    carts.findActiveByUserId(userId),
  );
  if (cart) {
    if (!cart.userId.equals(userId)) {
      throw new CartNotFoundError();
    }
    return cart;
  }
  if (!createIfMissing || !ids || !clock) {
    throw new CartNotFoundError();
  }
  const created = new Cart(ids.nextCartId(), userId, [], clock.now());
  await callExternal('Persistencia de carritos', () => carts.save(created));
  return created;
}
