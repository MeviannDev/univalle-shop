import { Module } from '@nestjs/common';
import { CART_REPOSITORY } from '../domain/ports/outbound/cart-repository.port.js';
import { CATALOG_SERVICE } from '../domain/ports/outbound/catalog-service.port.js';
import { CLOCK } from '../domain/ports/outbound/clock.port.js';
import { ID_GENERATOR } from '../domain/ports/outbound/id-generator.port.js';
import { ORDER_REPOSITORY } from '../domain/ports/outbound/order-repository.port.js';
import { PAYMENT_SERVICE } from '../domain/ports/outbound/payment-service.port.js';
import { USER_SERVICE } from '../domain/ports/outbound/user-service.port.js';
import { ClientsModule } from '../infrastructure/clients/clients.module.js';
import { ServiceAdaptersModule } from '../infrastructure/adapters/service-adapters.module.js';
import { PersistenceModule } from '../infrastructure/persistence/persistence.module.js';
import { UpdateOrderStatusAdmin } from './use-cases/admin/update-order-status-admin.use-case.js';
import { AddItemToCart } from './use-cases/cart/add-item-to-cart.use-case.js';
import { ClearCart } from './use-cases/cart/clear-cart.use-case.js';
import { GetCart } from './use-cases/cart/get-cart.use-case.js';
import { RemoveItemFromCart } from './use-cases/cart/remove-item-from-cart.use-case.js';
import { UpdateCartItemQuantity } from './use-cases/cart/update-cart-item-quantity.use-case.js';
import { ApplyPaymentResult } from './use-cases/orders/apply-payment-result.use-case.js';
import { CancelOrder } from './use-cases/orders/cancel-order.use-case.js';
import { CreateOrderFromCart } from './use-cases/orders/create-order-from-cart.use-case.js';
import { GetOrderById } from './use-cases/orders/get-order-by-id.use-case.js';
import { ListOrdersAdmin } from './use-cases/orders/list-orders-admin.use-case.js';
import { ListUserOrders } from './use-cases/orders/list-user-orders.use-case.js';

const useCaseProviders = [
  {
    provide: AddItemToCart,
    inject: [CART_REPOSITORY, CATALOG_SERVICE, ID_GENERATOR, CLOCK, USER_SERVICE],
    useFactory: (...dependencies: ConstructorParameters<typeof AddItemToCart>) =>
      new AddItemToCart(...dependencies),
  },
  {
    provide: RemoveItemFromCart,
    inject: [CART_REPOSITORY, USER_SERVICE],
    useFactory: (...dependencies: ConstructorParameters<typeof RemoveItemFromCart>) =>
      new RemoveItemFromCart(...dependencies),
  },
  {
    provide: UpdateCartItemQuantity,
    inject: [CART_REPOSITORY, CATALOG_SERVICE, USER_SERVICE],
    useFactory: (...dependencies: ConstructorParameters<typeof UpdateCartItemQuantity>) =>
      new UpdateCartItemQuantity(...dependencies),
  },
  {
    provide: ClearCart,
    inject: [CART_REPOSITORY, ID_GENERATOR, CLOCK, USER_SERVICE],
    useFactory: (...dependencies: ConstructorParameters<typeof ClearCart>) =>
      new ClearCart(...dependencies),
  },
  {
    provide: GetCart,
    inject: [CART_REPOSITORY, ID_GENERATOR, CLOCK, USER_SERVICE],
    useFactory: (...dependencies: ConstructorParameters<typeof GetCart>) =>
      new GetCart(...dependencies),
  },
  {
    provide: CreateOrderFromCart,
    inject: [
      CART_REPOSITORY,
      ORDER_REPOSITORY,
      CATALOG_SERVICE,
      PAYMENT_SERVICE,
      ID_GENERATOR,
      CLOCK,
      USER_SERVICE,
    ],
    useFactory: (...dependencies: ConstructorParameters<typeof CreateOrderFromCart>) =>
      new CreateOrderFromCart(...dependencies),
  },
  {
    provide: GetOrderById,
    inject: [ORDER_REPOSITORY, USER_SERVICE],
    useFactory: (...dependencies: ConstructorParameters<typeof GetOrderById>) =>
      new GetOrderById(...dependencies),
  },
  {
    provide: ListUserOrders,
    inject: [ORDER_REPOSITORY, USER_SERVICE],
    useFactory: (...dependencies: ConstructorParameters<typeof ListUserOrders>) =>
      new ListUserOrders(...dependencies),
  },
  {
    provide: CancelOrder,
    inject: [ORDER_REPOSITORY, CATALOG_SERVICE, PAYMENT_SERVICE, USER_SERVICE],
    useFactory: (...dependencies: ConstructorParameters<typeof CancelOrder>) =>
      new CancelOrder(...dependencies),
  },
  {
    provide: ApplyPaymentResult,
    inject: [ORDER_REPOSITORY, CATALOG_SERVICE],
    useFactory: (...dependencies: ConstructorParameters<typeof ApplyPaymentResult>) =>
      new ApplyPaymentResult(...dependencies),
  },
  {
    provide: ListOrdersAdmin,
    inject: [ORDER_REPOSITORY, USER_SERVICE],
    useFactory: (...dependencies: ConstructorParameters<typeof ListOrdersAdmin>) =>
      new ListOrdersAdmin(...dependencies),
  },
  {
    provide: UpdateOrderStatusAdmin,
    inject: [ORDER_REPOSITORY, CATALOG_SERVICE, PAYMENT_SERVICE, USER_SERVICE],
    useFactory: (...dependencies: ConstructorParameters<typeof UpdateOrderStatusAdmin>) =>
      new UpdateOrderStatusAdmin(...dependencies),
  },
];

@Module({
  imports: [PersistenceModule, ServiceAdaptersModule, ClientsModule],
  providers: useCaseProviders,
  exports: useCaseProviders.map((provider) => provider.provide),
})
export class ApplicationModule {}
