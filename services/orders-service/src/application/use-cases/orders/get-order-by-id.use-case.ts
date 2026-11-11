import type { OrderRepository } from '../../../domain/ports/outbound/order-repository.port.js';
import type { UserServicePort } from '../../../domain/ports/outbound/user-service.port.js';
import type { Order } from '../../../domain/entities/order.js';
import { OrderId } from '../../../domain/value-objects/order-id.js';
import { OrderNotFoundError } from '../../errors/order-not-found.error.js';
import { assertOrderOwnerOrAdmin, authenticate } from '../../shared/authorization.js';
import { callExternal } from '../../shared/external-call.js';

export type GetOrderByIdCommand = { token: string; orderId: string };
export type GetOrderByIdResult = { order: Order };

export class GetOrderById {
  constructor(
    private readonly orders: OrderRepository,
    private readonly users: UserServicePort,
  ) {}

  async execute(command: GetOrderByIdCommand): Promise<GetOrderByIdResult> {
    const user = await authenticate(this.users, command.token);
    const order = await callExternal('Persistencia de órdenes', () =>
      this.orders.findById(new OrderId(command.orderId)),
    );
    if (!order) {
      throw new OrderNotFoundError();
    }
    assertOrderOwnerOrAdmin(user, order.userId.value);
    return { order };
  }
}
