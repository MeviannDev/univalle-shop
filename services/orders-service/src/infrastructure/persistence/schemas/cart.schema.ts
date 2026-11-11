import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

@Schema({ _id: false, versionKey: false })
export class StoredMoney {
  @Prop({ required: true, min: 0, type: Number })
  amount!: number;

  @Prop({ required: true, match: /^[A-Z]{3}$/, type: String })
  currency!: string;
}

@Schema({ _id: false, versionKey: false })
export class StoredCartItem {
  @Prop({ required: true, type: String })
  productId!: string;

  @Prop({ required: true, trim: true, type: String })
  name!: string;

  @Prop({ required: true, type: StoredMoney })
  unitPrice!: StoredMoney;

  @Prop({ required: true, min: 1, max: 99, type: Number })
  quantity!: number;
}

@Schema({ collection: 'carts', versionKey: false })
export class CartSchema {
  @Prop({ required: true, type: String })
  userId!: string;

  @Prop({ required: true, type: String })
  _id!: string;

  @Prop({ required: true, type: [StoredCartItem], default: [] })
  items!: StoredCartItem[];

  @Prop({ required: true, type: Date })
  createdAt!: Date;

  @Prop({ required: true, type: Date })
  updatedAt!: Date;
}

export type CartDocument = HydratedDocument<CartSchema>;
export const CartMongooseSchema = SchemaFactory.createForClass(CartSchema);
CartMongooseSchema.index({ userId: 1 }, { unique: true });
