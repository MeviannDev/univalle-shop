export class CategoryId {
  private constructor(private readonly value: string) {}

  static create(id?: string): CategoryId {
    if (id) {
      if (!id.startsWith('cat_')) {
        throw new Error('CategoryId must start with "cat_"');
      }
      return new CategoryId(id);
    }
    const generated = `cat_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    return new CategoryId(generated);
  }

  static fromString(id: string): CategoryId {
    return CategoryId.create(id);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: CategoryId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}