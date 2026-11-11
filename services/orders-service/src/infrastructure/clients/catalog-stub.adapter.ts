import { Injectable } from '@nestjs/common';
import type {
  Availability,
  CatalogServicePort,
  ProductSnapshot,
  ReservationResult,
  StockReservation,
} from '../../domain/ports/outbound/catalog-service.port.js';
import { Money } from '../../domain/value-objects/money.js';
import { ProductId } from '../../domain/value-objects/product-id.js';
import type { Quantity } from '../../domain/value-objects/quantity.js';
import { ProductUnavailableError } from '../../application/errors/product-unavailable.error.js';

@Injectable()
export class CatalogStubAdapter implements CatalogServicePort {
  private readonly products = new Map<string, ProductSnapshot>([
    [
      'demo-notebook',
      {
        productId: new ProductId('demo-notebook'),
        name: 'Cuaderno Univalle',
        unitPrice: new Money(125_000, 'COP'),
        available: true,
        stock: 100,
      },
    ],
    [
      'demo-shirt',
      {
        productId: new ProductId('demo-shirt'),
        name: 'Camiseta Univalle',
        unitPrice: new Money(4_500_000, 'COP'),
        available: true,
        stock: 25,
      },
    ],
  ]);
  private readonly reservations = new Map<string, StockReservation>();

  async getProduct(productId: ProductId): Promise<ProductSnapshot> {
    const product = this.products.get(productId.value);
    if (!product) {
      throw new ProductUnavailableError(productId.value);
    }
    return { ...product };
  }

  async checkAvailability(productId: ProductId, quantity: Quantity): Promise<Availability> {
    const product = await this.getProduct(productId);
    return {
      productId,
      available: product.available && product.stock >= quantity.value,
      stock: product.stock,
    };
  }

  async reserveStock(reservation: StockReservation): Promise<ReservationResult> {
    const existing = this.reservations.get(reservation.reservationId);
    if (existing) {
      return { reservationId: reservation.reservationId, reserved: true };
    }
    const product = await this.getProduct(reservation.productId);
    if (!product.available || product.stock < reservation.quantity.value) {
      return { reservationId: reservation.reservationId, reserved: false };
    }
    this.products.set(product.productId.value, {
      ...product,
      stock: product.stock - reservation.quantity.value,
    });
    this.reservations.set(reservation.reservationId, reservation);
    return { reservationId: reservation.reservationId, reserved: true };
  }

  async releaseStock(reservationId: string): Promise<void> {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) {
      return;
    }
    const product = await this.getProduct(reservation.productId);
    this.products.set(product.productId.value, {
      ...product,
      stock: product.stock + reservation.quantity.value,
    });
    this.reservations.delete(reservationId);
  }

  async commitStock(reservationId: string): Promise<void> {
    this.reservations.delete(reservationId);
  }
}
