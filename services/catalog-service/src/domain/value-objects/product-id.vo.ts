export class ProductId {
  private constructor(private readonly value: string) {}

  static create(id?: string): ProductId {
    if (id) {
      if (!id.startsWith('prod_')) {
        throw new Error('ProductId must start with "prod_"');
      }
      return new ProductId(id);
    }
    const generated = `prod_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    return new ProductId(generated);
  }

  static fromString(id: string): ProductId {
    return ProductId.create(id);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: ProductId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}