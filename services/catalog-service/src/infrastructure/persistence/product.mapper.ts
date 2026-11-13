import { Product, ProductKind } from '../../domain/entities/product.entity.js';
import { ProductId } from '../../domain/value-objects/product-id.vo.js';
import { CategoryId } from '../../domain/value-objects/category-id.vo.js';
import { Money } from '../../domain/value-objects/money.vo.js';
import { Stock } from '../../domain/value-objects/stock.vo.js';

export interface ProductDocument {
  _id: string;
  name: string;
  description?: string;
  unitPrice: number; // centavos
  kind: ProductKind;
  categoryId?: string;
  stock?: {
    available: number;
    reserved: number;
  };
  available: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ProductMapper {
  static toDomain(doc: ProductDocument): Product {
    return Product.reconstitute({
      id: ProductId.fromString(doc._id),
      name: doc.name,
      description: doc.description,
      unitPrice: Money.fromCents(doc.unitPrice),
      kind: doc.kind,
      categoryId: doc.categoryId
        ? CategoryId.fromString(doc.categoryId)
        : undefined,
      stock: doc.stock
        ? Stock.create(doc.stock.available, doc.stock.reserved)
        : undefined,
      available: doc.available,
      createdAt: new Date(doc.createdAt),
      updatedAt: new Date(doc.updatedAt),
    });
  }

  static toPersistence(product: Product): ProductDocument {
    return {
      _id: product.id.getValue(),
      name: product.name,
      description: product.description,
      unitPrice: product.unitPrice.getCents(),
      kind: product.kind,
      categoryId: product.categoryId?.getValue(),
      stock: product.stock
        ? {
            available: product.stock.getAvailable(),
            reserved: product.stock.getReserved(),
          }
        : undefined,
      available: product.available,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}