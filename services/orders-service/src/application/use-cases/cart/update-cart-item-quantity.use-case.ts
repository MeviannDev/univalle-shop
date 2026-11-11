import type { CartRepository } from '../../../domain/ports/outbound/cart-repository.port.js';
import type { CatalogServicePort } from '../../../domain/ports/outbound/catalog-service.port.js';
import type { UserServicePort } from '../../../domain/ports/outbound/user-service.port.js';
import { ProductId } from '../../../domain/value-objects/product-id.js';
import { Quantity } from '../../../domain/value-objects/quantity.js';
import { CartItemNotFoundError } from '../../errors/cart-item-not-found.error.js';
import { ProductUnavailableError } from '../../errors/product-unavailable.error.js';
import { authenticate } from '../../shared/authorization.js';
import { callExternal } from '../../shared/external-call.js';
import { loadCart } from '../../shared/load-cart.js';

export type UpdateCartItemQuantityCommand = {
  token: string;
  productId: string;
  quantity: number;
};
export type UpdateCartItemQuantityResult = { cart: Awaited<ReturnType<typeof loadCart>> };

export class UpdateCartItemQuantity {
  constructor(
    private readonly carts: CartRepository,
    private readonly catalog: CatalogServicePort,
    private readonly users: UserServicePort,
  ) {}

  async execute(command: UpdateCartItemQuantityCommand): Promise<UpdateCartItemQuantityResult> {
    const user = await authenticate(this.users, command.token);
    const productId = new ProductId(command.productId);
    const quantity = new Quantity(command.quantity);
    const cart = await loadCart(this.carts, user.userId, false);
    if (!cart.items.some((item) => item.productId.equals(productId))) {
      throw new CartItemNotFoundError();
    }
    const availability = await callExternal('Catálogo', () =>
      this.catalog.checkAvailability(productId, quantity),
    );
    if (!availability.available || availability.stock < quantity.value) {
      throw new ProductUnavailableError(productId.value);
    }
    cart.changeQuantity(productId, quantity);
    await callExternal('Persistencia de carritos', () => this.carts.save(cart));
    return { cart };
  }
}
