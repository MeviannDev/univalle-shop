import type { CartRepository } from '../../../domain/ports/outbound/cart-repository.port.js';
import type { CatalogServicePort } from '../../../domain/ports/outbound/catalog-service.port.js';
import type { ClockPort } from '../../../domain/ports/outbound/clock.port.js';
import type { IdGeneratorPort } from '../../../domain/ports/outbound/id-generator.port.js';
import type { UserServicePort } from '../../../domain/ports/outbound/user-service.port.js';
import { CartItem } from '../../../domain/entities/cart-item.js';
import { ProductId } from '../../../domain/value-objects/product-id.js';
import { Quantity } from '../../../domain/value-objects/quantity.js';
import { ProductUnavailableError } from '../../errors/product-unavailable.error.js';
import { InvalidDependencyResponseError } from '../../errors/invalid-dependency-response.error.js';
import { authenticate } from '../../shared/authorization.js';
import { callExternal } from '../../shared/external-call.js';
import { loadCart } from '../../shared/load-cart.js';

export type AddItemToCartCommand = {
  token: string;
  productId: string;
  quantity: number;
};

export type AddItemToCartResult = {
  cart: Awaited<ReturnType<typeof loadCart>>;
};

export class AddItemToCart {
  constructor(
    private readonly carts: CartRepository,
    private readonly catalog: CatalogServicePort,
    private readonly ids: IdGeneratorPort,
    private readonly clock: ClockPort,
    private readonly users: UserServicePort,
  ) {}

  async execute(command: AddItemToCartCommand): Promise<AddItemToCartResult> {
    const user = await authenticate(this.users, command.token);
    const productId = new ProductId(command.productId);
    const quantity = new Quantity(command.quantity);
    const product = await callExternal('Catálogo', () => this.catalog.getProduct(productId));
    if (!product.productId.equals(productId) || !product.name.trim()) {
      throw new InvalidDependencyResponseError('Catálogo');
    }
    if (!product.available || !Number.isSafeInteger(product.stock) || product.stock < 0) {
      throw new ProductUnavailableError(productId.value);
    }
    const cart = await loadCart(this.carts, user.userId, true, this.ids, this.clock);
    const existing = cart.items.find((item) => item.productId.equals(productId));
    const requested = new Quantity((existing?.quantity.value ?? 0) + quantity.value);
    const availability = await callExternal('Catálogo', () =>
      this.catalog.checkAvailability(productId, requested),
    );
    if (
      !availability.productId.equals(productId) ||
      !Number.isSafeInteger(availability.stock) ||
      !availability.available ||
      availability.stock < requested.value
    ) {
      throw new ProductUnavailableError(productId.value);
    }
    cart.addItem(new CartItem(product.productId, product.name, product.unitPrice, quantity));
    await callExternal('Persistencia de carritos', () => this.carts.save(cart));
    return { cart };
  }
}
