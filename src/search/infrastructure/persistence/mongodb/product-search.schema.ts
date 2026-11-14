import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'products', timestamps: true })
export class ProductSearchDocument {
  @Prop({ required: true, unique: true })
  productId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  category!: string;

  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop()
  imageUrl?: string;

  @Prop({ required: true, default: true })
  isActive!: boolean;
}

export const ProductSearchSchema =
  SchemaFactory.createForClass(ProductSearchDocument);

ProductSearchSchema.index(
  { name: 'text', category: 'text', description: 'text' },
  {
    weights: { name: 10, category: 5, description: 1 },
    default_language: 'spanish',
  },
);
