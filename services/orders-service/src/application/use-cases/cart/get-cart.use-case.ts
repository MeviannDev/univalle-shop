import type { CartRepository } from '../../../domain/ports/outbound/cart-repository.port.js';
import type { ClockPort } from '../../../domain/ports/outbound/clock.port.js';
import type { IdGeneratorPort } from '../../../domain/ports/outbound/id-generator.port.js';
import type { UserServicePort } from '../../../domain/ports/outbound/user-service.port.js';
import { authenticate } from '../../shared/authorization.js';
import { loadCart } from '../../shared/load-cart.js';

export type GetCartCommand = { token: string };
export type GetCartResult = { cart: Awaited<ReturnType<typeof loadCart>> };

export class GetCart {
  constructor(
    private readonly carts: CartRepository,
    private readonly ids: IdGeneratorPort,
    private readonly clock: ClockPort,
    private readonly users: UserServicePort,
  ) {}

  async execute(command: GetCartCommand): Promise<GetCartResult> {
    const user = await authenticate(this.users, command.token);
    return {
      cart: await loadCart(this.carts, user.userId, true, this.ids, this.clock),
    };
  }
}
