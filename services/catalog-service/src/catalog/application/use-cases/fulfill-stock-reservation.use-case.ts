import type { InventoryReservationRepository } from '../ports/inventory-reservation.repository.js';

export class FulfillStockReservationUseCase {
  constructor(private readonly reservations: InventoryReservationRepository) {}

  execute(reservationId: string) {
    return this.reservations.fulfill(reservationId);
  }
}
