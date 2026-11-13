import { CategoryId } from '../value-objects/category-id.vo.js';

export interface CategoryProps {
  id: CategoryId;
  name: string;
  description?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Category {
  private constructor(private props: CategoryProps) {}

  static create(params: { name: string; description?: string }): Category {
    const now = new Date();
    return new Category({
      id: CategoryId.create(),
      name: params.name.trim(),
      description: params.description?.trim(),
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: CategoryProps): Category {
    return new Category(props);
  }

  get id(): CategoryId {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get active(): boolean {
    return this.props.active;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  rename(newName: string): void {
    this.props.name = newName.trim();
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.active = false;
    this.props.updatedAt = new Date();
  }

  activate(): void {
    this.props.active = true;
    this.props.updatedAt = new Date();
  }
}