import type { CartRepository } from '../../../domain/ports/outbound/cart-repository.port.js';
import type { UserServicePort } from '../../../domain/ports/outbound/user-service.port.js';
import { ProductId } from '../../../domain/value-objects/product-id.js';
import { CartItemNotFoundError } from '../../errors/cart-item-not-found.error.js';
import { authenticate } from '../../shared/authorization.js';
import { callExternal } from '../../shared/external-call.js';
import { loadCart } from '../../shared/load-cart.js';

export type RemoveItemFromCartCommand = { token: string; productId: string };
export type RemoveItemFromCartResult = { cart: Awaited<ReturnType<typeof loadCart>> };

export class RemoveItemFromCart {
  constructor(
    private readonly carts: CartRepository,
    private readonly users: UserServicePort,
  ) {}

  async execute(command: RemoveItemFromCartCommand): Promise<RemoveItemFromCartResult> {
    const user = await authenticate(this.users, command.token);
    const cart = await loadCart(this.carts, user.userId, false);
    const productId = new ProductId(command.productId);
    if (!cart.items.some((item) => item.productId.equals(productId))) {
      throw new CartItemNotFoundError();
    }
    cart.removeItem(productId);
    await callExternal('Persistencia de carritos', () => this.carts.save(cart));
    return { cart };
  }
}
