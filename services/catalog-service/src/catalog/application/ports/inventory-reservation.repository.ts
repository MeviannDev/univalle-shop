import type { InventoryReservation } from '../../domain/inventory-reservation.js';

export const INVENTORY_RESERVATION_REPOSITORY = Symbol(
  'INVENTORY_RESERVATION_REPOSITORY',
);

export type CreateInventoryReservation = Omit<InventoryReservation, 'status'>;

export type ReservationTransitionResult = {
  reservationId: string;
  status: 'COMMITTED' | 'RELEASED';
};

export interface InventoryReservationRepository {
  reserve(input: CreateInventoryReservation): Promise<InventoryReservation>;
  commit(reservationId: string): Promise<ReservationTransitionResult>;
  release(reservationId: string): Promise<ReservationTransitionResult>;
}
