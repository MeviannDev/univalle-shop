import { DomainError } from './domain.error.js';
import type { OrderStatusValue } from '../value-objects/order-status.js';

export class InvalidOrderTransitionError extends DomainError {
  constructor(from: OrderStatusValue, to: OrderStatusValue) {
    super(`La transición de ${from} a ${to} no está permitida`, 'ORDER_INVALID_TRANSITION');
  }
}
