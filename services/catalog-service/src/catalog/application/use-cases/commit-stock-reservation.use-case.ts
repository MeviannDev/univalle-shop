import type { InventoryReservationRepository } from '../ports/inventory-reservation.repository.js';

export class CommitStockReservationUseCase {
  constructor(private readonly reservations: InventoryReservationRepository) {}

  execute(reservationId: string) {
    return this.reservations.commit(reservationId);
  }
}
