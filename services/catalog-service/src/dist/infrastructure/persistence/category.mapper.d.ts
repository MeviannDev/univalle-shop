import { Category } from '../../domain/entities/category.entity.js';
export interface CategoryDocument {
    _id: string;
    name: string;
    description?: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare class CategoryMapper {
    static toDomain(doc: CategoryDocument): Category;
    static toPersistence(category: Category): CategoryDocument;
}
