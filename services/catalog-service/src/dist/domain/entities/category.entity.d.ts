import { CategoryId } from '../value-objects/category-id.vo.js';
export interface CategoryProps {
    id: CategoryId;
    name: string;
    description?: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare class Category {
    private props;
    private constructor();
    static create(params: {
        name: string;
        description?: string;
    }): Category;
    static reconstitute(props: CategoryProps): Category;
    get id(): CategoryId;
    get name(): string;
    get description(): string | undefined;
    get active(): boolean;
    get createdAt(): Date;
    get updatedAt(): Date;
    rename(newName: string): void;
    deactivate(): void;
    activate(): void;
}
