export interface ProductProps {
  id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  stock: number;
  active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CreateProductData = Omit<
  ProductProps,
  'id' | 'active' | 'createdAt' | 'updatedAt'
> & {
  active?: boolean;
};

export type UpdateProductData = Partial<CreateProductData>;

export class InvalidProductError extends Error {
  constructor(message: string) {
    super(message);
    this.name = InvalidProductError.name;
  }
}

export class Product {
  readonly id?: string;
  readonly name: string;
  readonly description: string;
  readonly price: number;
  readonly category: string;
  readonly images: string[];
  readonly stock: number;
  readonly active: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  constructor(props: ProductProps) {
    if (!props.name.trim()) {
      throw new InvalidProductError('El nombre del producto es obligatorio.');
    }
    if (!Number.isFinite(props.price) || props.price < 0) {
      throw new InvalidProductError(
        'El precio debe ser un número mayor o igual a cero.',
      );
    }
    if (!Number.isInteger(props.stock) || props.stock < 0) {
      throw new InvalidProductError(
        'El inventario debe ser un entero mayor o igual a cero.',
      );
    }
    if (!props.category.trim()) {
      throw new InvalidProductError(
        'La categoría del producto es obligatoria.',
      );
    }

    this.id = props.id;
    this.name = props.name.trim();
    this.description = props.description.trim();
    this.price = props.price;
    this.category = props.category.trim();
    this.images = [...props.images];
    this.stock = props.stock;
    this.active = props.active ?? true;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}

export class ProductNotFoundError extends Error {
  constructor(id: string) {
    super(`No se encontró el producto con id "${id}".`);
    this.name = ProductNotFoundError.name;
  }
}
