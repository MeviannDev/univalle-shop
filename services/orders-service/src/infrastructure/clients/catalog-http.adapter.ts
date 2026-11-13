import { Injectable } from '@nestjs/common';
import type {
  Availability,
  CatalogServicePort,
  ProductSnapshot,
  ReservationResult,
  StockReservation,
} from '../../domain/ports/outbound/catalog-service.port.js';
import { Money } from '../../domain/value-objects/money.js';
import type { ProductId } from '../../domain/value-objects/product-id.js';
import type { Quantity } from '../../domain/value-objects/quantity.js';
import {
  adaptCall,
  asRecord,
  requiredNumber,
  requiredString,
} from './external-error.mapper.js';
import { HttpServiceClient } from './http-service-client.js';

@Injectable()
export class CatalogHttpAdapter implements CatalogServicePort {
  constructor(private readonly http: HttpServiceClient) {}

  async getProduct(productId: ProductId): Promise<ProductSnapshot> {
    return adaptCall('Catálogo', async () => {
      const body = asRecord(
        await this.http.request(
          'catalog',
          `/api/products/${encodeURIComponent(productId.value)}`,
          { idempotent: true },
        ),
      );
      const price = asRecord(body.unitPrice ?? body.price);
      return {
        productId: productId,
        name: requiredString(body.name, 'name'),
        unitPrice: new Money(
          requiredNumber(price.amount, 'price.amount'),
          requiredString(price.currency, 'price.currency'),
        ),
        available: body.available === true,
        stock: requiredNumber(body.stock, 'stock'),
      };
    });
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
    return adaptCall('Catálogo', async () => {
      const body = asRecord(
        await this.http.request(
          'catalog',
          '/api/inventory/reservations',
          {
            method: 'POST',
            idempotent: true,
            body: {
              reservationId: reservation.reservationId,
              productId: reservation.productId.value,
              quantity: reservation.quantity.value,
            },
          },
        ),
      );
      return {
        reservationId: requiredString(body.reservationId, 'reservationId'),
        reserved: body.reserved === true,
      };
    });
  }

  async releaseStock(reservationId: string): Promise<void> {
    await adaptCall('Catálogo', () =>
      this.http.request(
        'catalog',
        `/api/inventory/reservations/${encodeURIComponent(reservationId)}`,
        { method: 'DELETE', idempotent: true },
      ),
    );
  }

  async commitStock(reservationId: string): Promise<void> {
    await adaptCall('Catálogo', () =>
      this.http.request(
        'catalog',
        `/api/inventory/reservations/${encodeURIComponent(reservationId)}/commit`,
        { method: 'POST', idempotent: true, body: {} },
      ),
    );
  }
}
