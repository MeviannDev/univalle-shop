import type { AdminOrderFilter, OrderRepository, Page, PageRequest } from '../../../domain/ports/outbound/order-repository.port.js';
import type { Order } from '../../../domain/entities/order.js';
import type { UserServicePort } from '../../../domain/ports/outbound/user-service.port.js';
import { ORDER_STATUSES } from '../../../domain/value-objects/order-status.js';
import { InvalidOrderFilterError } from '../../errors/invalid-order-filter.error.js';
import { authorizeAdmin } from '../../shared/authorization.js';
import { callExternal } from '../../shared/external-call.js';
import { validatePageRequest } from '../../shared/pagination.js';

export type ListOrdersAdminCommand = {
  token: string;
  filter: AdminOrderFilter;
  page: PageRequest;
};
export type ListOrdersAdminResult = Page<Order>;

export class ListOrdersAdmin {
  constructor(
    private readonly orders: OrderRepository,
    private readonly users: UserServicePort,
  ) {}

  async execute(command: ListOrdersAdminCommand): Promise<ListOrdersAdminResult> {
    await authorizeAdmin(this.users, command.token);
    validatePageRequest(command.page);
    if (command.filter.status && !ORDER_STATUSES.includes(command.filter.status)) {
      throw new InvalidOrderFilterError();
    }
    return callExternal('Persistencia de órdenes', () =>
      this.orders.listAll(command.filter, command.page),
    );
  }
}
