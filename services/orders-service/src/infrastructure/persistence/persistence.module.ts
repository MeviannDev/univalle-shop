import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CART_REPOSITORY } from '../../domain/ports/outbound/cart-repository.port.js';
import { ORDER_REPOSITORY } from '../../domain/ports/outbound/order-repository.port.js';
import { MongooseCartRepository } from './repositories/mongoose-cart.repository.js';
import { MongooseOrderRepository } from './repositories/mongoose-order.repository.js';
import { CartMongooseSchema, CartSchema } from './schemas/cart.schema.js';
import { OrderMongooseSchema, OrderSchema } from './schemas/order.schema.js';
import {
  PaymentEventMongooseSchema,
  PaymentEventSchema,
} from './schemas/payment-event.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CartSchema.name, schema: CartMongooseSchema },
      { name: OrderSchema.name, schema: OrderMongooseSchema },
      { name: PaymentEventSchema.name, schema: PaymentEventMongooseSchema },
    ]),
  ],
  providers: [
    MongooseCartRepository,
    MongooseOrderRepository,
    { provide: CART_REPOSITORY, useExisting: MongooseCartRepository },
    { provide: ORDER_REPOSITORY, useExisting: MongooseOrderRepository },
  ],
  exports: [CART_REPOSITORY, ORDER_REPOSITORY],
})
export class PersistenceModule {}
