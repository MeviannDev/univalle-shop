import type { Money } from '../../value-objects/money.js';
import type { ProductId } from '../../value-objects/product-id.js';
import type { Quantity } from '../../value-objects/quantity.js';

export const CATALOG_SERVICE = Symbol('CATALOG_SERVICE');

export type ProductSnapshot = {
  productId: ProductId;
  name: string;
  unitPrice: Money;
  available: boolean;
  stock: number;
};

export type Availability = {
  productId: ProductId;
  available: boolean;
  stock: number;
};

export type StockReservation = {
  reservationId: string;
  productId: ProductId;
  quantity: Quantity;
};

export type ReservationResult = {
  reservationId: string;
  reserved: boolean;
};

export interface CatalogServicePort {
  getProduct(productId: ProductId): Promise<ProductSnapshot>;
  checkAvailability(productId: ProductId, quantity: Quantity): Promise<Availability>;
  reserveStock(reservation: StockReservation): Promise<ReservationResult>;
  releaseStock(reservationId: string): Promise<void>;
  commitStock(reservationId: string): Promise<void>;
}
