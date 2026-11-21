import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProductDocument = HydratedDocument<ProductSchema>;

@Schema({ timestamps: true, collection: 'products' })
export class ProductSchema {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop({ required: true, trim: true, index: true })
  category!: string;

  @Prop({ type: [String], default: [] })
  images!: string[];

  @Prop({ required: true, min: 0, validate: Number.isInteger })
  stock!: number;

  @Prop({ default: true })
  active!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ProductMongoSchema = SchemaFactory.createForClass(ProductSchema);
