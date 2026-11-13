import { CategoryId } from '../value-objects/category-id.vo.js';
export class Category {
    props;
    constructor(props) {
        this.props = props;
    }
    static create(params) {
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
    static reconstitute(props) {
        return new Category(props);
    }
    get id() {
        return this.props.id;
    }
    get name() {
        return this.props.name;
    }
    get description() {
        return this.props.description;
    }
    get active() {
        return this.props.active;
    }
    get createdAt() {
        return this.props.createdAt;
    }
    get updatedAt() {
        return this.props.updatedAt;
    }
    rename(newName) {
        this.props.name = newName.trim();
        this.props.updatedAt = new Date();
    }
    deactivate() {
        this.props.active = false;
        this.props.updatedAt = new Date();
    }
    activate() {
        this.props.active = true;
        this.props.updatedAt = new Date();
    }
}
//# sourceMappingURL=category.entity.js.map