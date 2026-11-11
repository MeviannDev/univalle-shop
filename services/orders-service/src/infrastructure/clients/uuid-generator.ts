import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { IdGeneratorPort } from '../../domain/ports/outbound/id-generator.port.js';
import { CartId } from '../../domain/value-objects/cart-id.js';
import { OrderId } from '../../domain/value-objects/order-id.js';

@Injectable()
export class UuidGenerator implements IdGeneratorPort {
  nextCartId(): CartId {
    return new CartId(`cart_${randomUUID()}`);
  }

  nextOrderId(): OrderId {
    return new OrderId(`order_${randomUUID()}`);
  }

  nextReservationId(): string {
    return `reservation_${randomUUID()}`;
  }
}
