import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { RESERVATION_STATUSES } from '../../../domain/inventory-reservation.js';

@Schema({ collection: 'inventory_reservations', versionKey: false })
export class InventoryReservationSchema {
  @Prop({ required: true, type: String })
  reservationId!: string;

  @Prop({ required: true, type: String })
  productId!: string;

  @Prop({ required: true, min: 1, type: Number })
  quantity!: number;

  @Prop({ required: true, enum: RESERVATION_STATUSES, type: String })
  status!: string;

  @Prop({ required: true, type: Date, default: Date.now })
  createdAt!: Date;
}

export type InventoryReservationDocument =
  HydratedDocument<InventoryReservationSchema>;
export const InventoryReservationMongoSchema = SchemaFactory.createForClass(
  InventoryReservationSchema,
);

InventoryReservationMongoSchema.index({ reservationId: 1 }, { unique: true });
InventoryReservationMongoSchema.index({ productId: 1, status: 1 });
