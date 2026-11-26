import type { InventoryReservationRepository } from '../ports/inventory-reservation.repository.js';

export class CancelStockReservationUseCase {
  constructor(private readonly reservations: InventoryReservationRepository) {}

  execute(reservationId: string) {
    return this.reservations.cancel(reservationId);
  }
}
