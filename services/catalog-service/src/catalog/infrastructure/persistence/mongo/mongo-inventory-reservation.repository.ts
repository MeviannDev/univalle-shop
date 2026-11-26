import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { Connection, Model } from 'mongoose';
import { ProductNotFoundError } from '../../../domain/product.js';
import {
  InsufficientStockError,
  InventoryReservationConflictError,
  InventoryReservationNotFoundError,
  type InventoryReservation,
  type ReservationStatus,
} from '../../../domain/inventory-reservation.js';
import type {
  CreateInventoryReservation,
  InventoryReservationRepository,
  ReservationTransitionResult,
} from '../../../application/ports/inventory-reservation.repository.js';
import type { ProductDocument } from './product.schema.js';
import { ProductSchema } from './product.schema.js';
import type { InventoryReservationDocument } from './inventory-reservation.schema.js';
import { InventoryReservationSchema } from './inventory-reservation.schema.js';

@Injectable()
export class MongoInventoryReservationRepository implements InventoryReservationRepository {
  constructor(
    @InjectModel(ProductSchema.name)
    private readonly products: Model<ProductDocument>,
    @InjectModel(InventoryReservationSchema.name)
    private readonly reservations: Model<InventoryReservationDocument>,
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async reserve(
    input: CreateInventoryReservation,
  ): Promise<InventoryReservation> {
    const session = await this.connection.startSession();
    let result: InventoryReservation | undefined;
    try {
      await session.withTransaction(async () => {
        const existing = await this.reservations
          .findOne({ reservationId: input.reservationId })
          .session(session)
          .exec();
        if (existing) {
          result = this.replayReservation(existing, input);
          return;
        }

        const product = await this.products
          .findOneAndUpdate(
            {
              _id: input.productId,
              active: true,
              stock: { $gte: input.quantity },
            },
            {
              $inc: {
                stock: -input.quantity,
                reservedStock: input.quantity,
              },
            },
            { session, returnDocument: 'after' },
          )
          .exec();
        if (!product) {
          const exists = await this.products
            .exists({ _id: input.productId })
            .session(session);
          if (!exists) throw new ProductNotFoundError(input.productId);
          throw new InsufficientStockError();
        }

        const [created] = await this.reservations.create(
          [{ ...input, status: 'RESERVED' }],
          { session },
        );
        if (!created) {
          throw new Error(
            'Catalog no pudo registrar la reserva de inventario.',
          );
        }
        result = this.toReservation(created);
      });
      if (!result) {
        throw new Error('Catalog no devolvió el resultado de la reserva.');
      }
      return result;
    } catch (error) {
      if (!this.isDuplicateKey(error)) throw error;
      const winner = await this.reservations
        .findOne({ reservationId: input.reservationId })
        .exec();
      if (!winner) throw error;
      return this.replayReservation(winner, input);
    } finally {
      await session.endSession();
    }
  }

  async commit(reservationId: string): Promise<ReservationTransitionResult> {
    const session = await this.connection.startSession();
    try {
      let result: ReservationTransitionResult | undefined;
      await session.withTransaction(async () => {
        const reservation = await this.reservations
          .findOne({ reservationId })
          .session(session)
          .exec();
        if (!reservation) throw new InventoryReservationNotFoundError();
        if (reservation.status === 'COMMITTED') {
          result = { reservationId, status: 'COMMITTED' };
          return;
        }
        if (reservation.status !== 'RESERVED') {
          throw new InventoryReservationConflictError(
            'No se puede confirmar una reserva ya liberada.',
          );
        }

        const productResult = await this.products
          .updateOne(
            {
              _id: reservation.productId,
              reservedStock: { $gte: reservation.quantity },
            },
            { $inc: { reservedStock: -reservation.quantity } },
            { session },
          )
          .exec();
        if (productResult.matchedCount !== 1) {
          throw new InventoryReservationConflictError(
            'El stock reservado no coincide con la reserva.',
          );
        }

        await this.reservations
          .updateOne(
            { reservationId, status: 'RESERVED' },
            { $set: { status: 'COMMITTED' } },
            { session },
          )
          .exec();
        result = { reservationId, status: 'COMMITTED' };
      });
      if (!result) {
        throw new Error('Catalog no devolvió el resultado de confirmación.');
      }
      return result;
    } finally {
      await session.endSession();
    }
  }

  async release(reservationId: string): Promise<ReservationTransitionResult> {
    const session = await this.connection.startSession();
    try {
      let result: ReservationTransitionResult | undefined;
      await session.withTransaction(async () => {
        const reservation = await this.reservations
          .findOne({ reservationId })
          .session(session)
          .exec();
        if (!reservation) {
          result = { reservationId, status: 'RELEASED' };
          return;
        }
        if (reservation.status === 'RELEASED') {
          result = { reservationId, status: 'RELEASED' };
          return;
        }
        if (reservation.status !== 'RESERVED') {
          throw new InventoryReservationConflictError(
            'No se puede liberar una reserva ya confirmada.',
          );
        }
        const productResult = await this.products
          .updateOne(
            {
              _id: reservation.productId,
              reservedStock: { $gte: reservation.quantity },
            },
            {
              $inc: {
                stock: reservation.quantity,
                reservedStock: -reservation.quantity,
              },
            },
            { session },
          )
          .exec();
        if (productResult.matchedCount !== 1) {
          throw new InventoryReservationConflictError(
            'El producto o el stock reservado ya no existe.',
          );
        }

        await this.reservations
          .updateOne(
            { reservationId, status: 'RESERVED' },
            { $set: { status: 'RELEASED' } },
            { session },
          )
          .exec();
        result = { reservationId, status: 'RELEASED' };
      });
      if (!result) {
        throw new Error('Catalog no devolvió el resultado de liberación.');
      }
      return result;
    } finally {
      await session.endSession();
    }
  }

  async cancel(reservationId: string): Promise<ReservationTransitionResult> {
    const session = await this.connection.startSession();
    try {
      let result: ReservationTransitionResult | undefined;
      await session.withTransaction(async () => {
        const reservation = await this.reservations
          .findOne({ reservationId })
          .session(session)
          .exec();
        if (!reservation) {
          result = { reservationId, status: 'RELEASED' };
          return;
        }
        if (
          reservation.status === 'RELEASED' ||
          reservation.status === 'RETURNED'
        ) {
          result = {
            reservationId,
            status:
              reservation.status === 'RELEASED' ? 'RELEASED' : 'RETURNED',
          };
          return;
        }
        if (
          reservation.status !== 'RESERVED' &&
          reservation.status !== 'COMMITTED'
        ) {
          throw new InventoryReservationConflictError(
            'La reserva no puede cancelarse en su estado actual.',
          );
        }

        const isReserved = reservation.status === 'RESERVED';
        const productResult = await this.products
          .updateOne(
            isReserved
              ? {
                  _id: reservation.productId,
                  reservedStock: { $gte: reservation.quantity },
                }
              : { _id: reservation.productId },
            {
              $inc: isReserved
                ? {
                    stock: reservation.quantity,
                    reservedStock: -reservation.quantity,
                  }
                : { stock: reservation.quantity },
            },
            { session },
          )
          .exec();
        if (productResult.matchedCount !== 1) {
          throw new InventoryReservationConflictError(
            'No se encontró el producto o el stock reservado para cancelarlo.',
          );
        }

        await this.reservations
          .updateOne(
            { reservationId, status: reservation.status },
            { $set: { status: isReserved ? 'RELEASED' : 'RETURNED' } },
            { session },
          )
          .exec();
        result = {
          reservationId,
          status: isReserved ? 'RELEASED' : 'RETURNED',
        };
      });
      if (!result) {
        throw new Error('Catalog no devolvió el resultado de cancelación.');
      }
      return result;
    } finally {
      await session.endSession();
    }
  }

  async fulfill(reservationId: string): Promise<ReservationTransitionResult> {
    const session = await this.connection.startSession();
    try {
      let result: ReservationTransitionResult | undefined;
      await session.withTransaction(async () => {
        const reservation = await this.reservations
          .findOne({ reservationId })
          .session(session)
          .exec();
        if (!reservation) throw new InventoryReservationNotFoundError();
        if (reservation.status === 'FULFILLED') {
          result = { reservationId, status: 'FULFILLED' };
          return;
        }
        if (reservation.status !== 'COMMITTED') {
          throw new InventoryReservationConflictError(
            'Solo se puede completar una reserva confirmada.',
          );
        }

        const update = await this.reservations
          .updateOne(
            { reservationId, status: 'COMMITTED' },
            { $set: { status: 'FULFILLED' } },
            { session },
          )
          .exec();
        if (update.matchedCount !== 1) {
          throw new InventoryReservationConflictError(
            'La reserva cambió de estado antes de completarse.',
          );
        }
        result = { reservationId, status: 'FULFILLED' };
      });
      if (!result) {
        throw new Error('Catalog no devolvió el resultado de finalización.');
      }
      return result;
    } finally {
      await session.endSession();
    }
  }

  private replayReservation(
    existing: InventoryReservationDocument,
    input: CreateInventoryReservation,
  ): InventoryReservation {
    if (
      existing.productId !== input.productId ||
      existing.quantity !== input.quantity ||
      existing.status === 'RELEASED' ||
      existing.status === 'RETURNED' ||
      existing.status === 'FULFILLED'
    ) {
      throw new InventoryReservationConflictError(
        'La referencia de reserva ya fue usada con otros datos o liberada.',
      );
    }
    return this.toReservation(existing);
  }

  private toReservation(
    document: InventoryReservationDocument,
  ): InventoryReservation {
    return {
      reservationId: document.reservationId,
      productId: document.productId,
      quantity: document.quantity,
      status: document.status as ReservationStatus,
    };
  }

  private isDuplicateKey(error: unknown): error is { code: number } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    );
  }
}
