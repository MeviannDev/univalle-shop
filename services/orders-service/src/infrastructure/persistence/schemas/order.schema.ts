import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { ORDER_STATUSES } from '../../../domain/value-objects/order-status.js';
import { StoredCartItem, StoredMoney } from './cart.schema.js';

@Schema({ _id: false, versionKey: false })
export class StoredOrderItem extends StoredCartItem {
  @Prop({ required: true, type: StoredMoney })
  subtotal!: StoredMoney;
}

@Schema({ _id: false, versionKey: false })
export class StoredStatusHistory {
  @Prop({ type: String, default: null })
  from!: string | null;

  @Prop({ required: true, enum: ORDER_STATUSES, type: String })
  to!: string;

  @Prop({ required: true, type: Date })
  at!: Date;

  @Prop({ required: true, type: String })
  actor!: string;
}

@Schema({ _id: false, versionKey: false })
export class StoredCompensation {
  @Prop({ required: true, enum: ['NONE', 'RELEASE_RESERVATIONS', 'COMMIT_RESERVATIONS', 'REFUND_AND_RELEASE'], type: String })
  pending!: 'NONE' | 'RELEASE_RESERVATIONS' | 'COMMIT_RESERVATIONS' | 'REFUND_AND_RELEASE';

  @Prop({ required: true, min: 0, type: Number, default: 0 })
  attempts!: number;

  @Prop({ type: String, default: null })
  lastError!: string | null;
}

@Schema({ collection: 'orders', versionKey: false })
export class OrderSchema {
  @Prop({ required: true, type: String })
  _id!: string;

  @Prop({ required: true, index: true, type: String })
  userId!: string;

  @Prop({ required: true, enum: ORDER_STATUSES, index: true, type: String })
  status!: string;

  @Prop({ required: true, type: [StoredOrderItem] })
  items!: StoredOrderItem[];

  @Prop({ required: true, type: StoredMoney })
  total!: StoredMoney;

  @Prop({ required: true, match: /^[A-Z]{3}$/, type: String })
  currency!: string;

  @Prop({ type: String, default: undefined })
  idempotencyKey?: string;

  @Prop({ type: String, default: null })
  paymentId!: string | null;

  @Prop({ required: true, type: [String], default: [] })
  reservationIds!: string[];

  @Prop({ required: true, type: [String], default: [] })
  processedPaymentEventIds!: string[];

  @Prop({ type: StoredCompensation, default: { pending: 'NONE', attempts: 0, lastError: null } })
  compensation!: StoredCompensation;

  @Prop({ type: Date, default: null })
  reconciliationLockedUntil!: Date | null;

  @Prop({ required: true, type: [StoredStatusHistory] })
  statusHistory!: StoredStatusHistory[];

  @Prop({ required: true, type: String })
  createdBy!: string;

  @Prop({ required: true, type: Date })
  createdAt!: Date;

  @Prop({ required: true, type: Date })
  updatedAt!: Date;
}

export type OrderDocument = HydratedDocument<OrderSchema>;
export const OrderMongooseSchema = SchemaFactory.createForClass(OrderSchema);
OrderMongooseSchema.index({ userId: 1, createdAt: -1 });
OrderMongooseSchema.index({ status: 1, createdAt: -1 });
OrderMongooseSchema.index(
  { userId: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: 'string' } },
  },
);
