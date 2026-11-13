import { Category } from '../../domain/entities/category.entity.js';
import { CategoryId } from '../../domain/value-objects/category-id.vo.js';

export interface CategoryDocument {
  _id: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class CategoryMapper {
  static toDomain(doc: CategoryDocument): Category {
    return Category.reconstitute({
      id: CategoryId.fromString(doc._id),
      name: doc.name,
      description: doc.description,
      active: doc.active,
      createdAt: new Date(doc.createdAt),
      updatedAt: new Date(doc.updatedAt),
    });
  }

  static toPersistence(category: Category): CategoryDocument {
    return {
      _id: category.id.getValue(),
      name: category.name,
      description: category.description,
      active: category.active,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}