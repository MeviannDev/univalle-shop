import {
  Product,
  ProductNotFoundError,
  type UpdateProductData,
} from '../../domain/product.js';
import type { ProductRepository } from '../ports/product.repository.js';

export class UpdateProductUseCase {
  constructor(private readonly products: ProductRepository) {}

  async execute(id: string, data: UpdateProductData) {
    const currentProduct = await this.products.findById(id);
    if (!currentProduct) {
      throw new ProductNotFoundError(id);
    }

    const updatedProduct = new Product({
      id: currentProduct.id,
      name: data.name ?? currentProduct.name,
      description: data.description ?? currentProduct.description,
      price: data.price ?? currentProduct.price,
      category: data.category ?? currentProduct.category,
      images: data.images ?? currentProduct.images,
      stock: data.stock ?? currentProduct.stock,
      active: data.active ?? currentProduct.active,
      createdAt: currentProduct.createdAt,
      updatedAt: currentProduct.updatedAt,
    });
    const product = await this.products.update(id, {
      name: updatedProduct.name,
      description: updatedProduct.description,
      price: updatedProduct.price,
      category: updatedProduct.category,
      images: updatedProduct.images,
      stock: updatedProduct.stock,
      active: updatedProduct.active,
    });
    if (!product) {
      throw new ProductNotFoundError(id);
    }
    return product;
  }
}
