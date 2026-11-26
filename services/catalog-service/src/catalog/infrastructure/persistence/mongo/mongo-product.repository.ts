import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Product,
  ProductHasActiveReservationsError,
  type CreateProductData,
  type UpdateProductData,
} from '../../../domain/product.js';
import type { ProductRepository } from '../../../application/ports/product.repository.js';
import { ProductSchema, type ProductDocument } from './product.schema.js';
import {
  InventoryReservationSchema,
  type InventoryReservationDocument,
} from './inventory-reservation.schema.js';

@Injectable()
export class MongoProductRepository implements ProductRepository {
  constructor(
    @InjectModel(ProductSchema.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(InventoryReservationSchema.name)
    private readonly reservationModel: Model<InventoryReservationDocument>,
  ) {}

  async create(data: CreateProductData): Promise<Product> {
    const document = await this.productModel.create(data);
    return this.toDomain(document);
  }

  async findAll(): Promise<Product[]> {
    const documents = await this.productModel
      .find()
      .sort({ createdAt: -1 })
      .exec();
    return documents.map((document) => this.toDomain(document));
  }

  async findById(id: string): Promise<Product | null> {
    const document = await this.productModel.findById(id).exec();
    return document ? this.toDomain(document) : null;
  }

  async update(id: string, data: UpdateProductData): Promise<Product | null> {
    const document = await this.productModel
      .findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
      .exec();
    return document ? this.toDomain(document) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.productModel
      .deleteOne({ _id: id, reservedStock: { $in: [0, null] } })
      .exec();
    if (result.deletedCount === 1) return true;

    const productExists = await this.productModel.exists({ _id: id }).exec();
    if (!productExists) return false;
    const hasActiveReservation = await this.reservationModel
      .exists({ productId: id, status: 'RESERVED' })
      .exec();
    if (hasActiveReservation) {
      throw new ProductHasActiveReservationsError();
    }
    return false;
  }

  private toDomain(document: ProductDocument): Product {
    return new Product({
      id: document._id.toString(),
      name: document.name,
      description: document.description,
      price: document.price,
      category: document.category,
      images: document.images,
      stock: document.stock,
      active: document.active,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }
}
