import { ProductNotFoundError } from '../../domain/product.js';
import { InventoryReservationConflictError } from '../../domain/inventory-reservation.js';
import type {
  CreateInventoryReservation,
  InventoryReservationRepository,
} from '../ports/inventory-reservation.repository.js';

export class ReserveStockUseCase {
  constructor(private readonly reservations: InventoryReservationRepository) {}

  async execute(input: CreateInventoryReservation) {
    if (
      !input.reservationId.trim() ||
      !Number.isInteger(input.quantity) ||
      input.quantity < 1
    ) {
      throw new InventoryReservationConflictError(
        'La referencia y cantidad de reserva deben ser válidas.',
      );
    }
    if (!/^[\da-f]{24}$/i.test(input.productId)) {
      throw new ProductNotFoundError(input.productId);
    }
    return this.reservations.reserve(input);
  }
}
