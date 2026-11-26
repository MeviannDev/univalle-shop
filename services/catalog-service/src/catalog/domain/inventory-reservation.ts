export const RESERVATION_STATUSES = [
  'RESERVED',
  'COMMITTED',
  'RELEASED',
] as const;

export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export type InventoryReservation = {
  reservationId: string;
  productId: string;
  quantity: number;
  status: ReservationStatus;
};

export class InsufficientStockError extends Error {
  readonly code = 'INSUFFICIENT_STOCK';

  constructor() {
    super('No hay existencias suficientes para reservar el producto.');
    this.name = InsufficientStockError.name;
  }
}

export class InventoryReservationConflictError extends Error {
  readonly code = 'RESERVATION_CONFLICT';

  constructor(message = 'La reserva no puede completar esta transición.') {
    super(message);
    this.name = InventoryReservationConflictError.name;
  }
}

export class InventoryReservationNotFoundError extends Error {
  readonly code = 'RESERVATION_NOT_FOUND';

  constructor() {
    super('La reserva de inventario no existe.');
    this.name = InventoryReservationNotFoundError.name;
  }
}
