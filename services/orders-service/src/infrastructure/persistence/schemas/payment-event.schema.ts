import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import type { PaymentEventInput } from '../../../domain/ports/outbound/order-repository.port.js';

@Schema({ collection: 'payment_events', versionKey: false })
export class PaymentEventSchema {
  @Prop({ required: true, type: String })
  eventId!: string;

  @Prop({ required: true, type: String })
  orderId!: string;

  @Prop({ required: true, type: String })
  paymentId!: string;

  @Prop({ required: true, enum: ['APPROVED', 'REJECTED', 'PENDING'], type: String })
  result!: PaymentEventInput['result'];

  @Prop({ required: true, type: Date, default: Date.now })
  createdAt!: Date;
}

export type PaymentEventDocument = HydratedDocument<PaymentEventSchema>;
export const PaymentEventMongooseSchema = SchemaFactory.createForClass(PaymentEventSchema);
PaymentEventMongooseSchema.index({ eventId: 1 }, { unique: true });
