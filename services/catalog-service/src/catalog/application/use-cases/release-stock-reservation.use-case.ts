import type { InventoryReservationRepository } from '../ports/inventory-reservation.repository.js';

export class ReleaseStockReservationUseCase {
  constructor(private readonly reservations: InventoryReservationRepository) {}

  execute(reservationId: string) {
    return this.reservations.release(reservationId);
  }
}
