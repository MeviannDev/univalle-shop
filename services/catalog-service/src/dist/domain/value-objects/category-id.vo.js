export class CategoryId {
    value;
    constructor(value) {
        this.value = value;
    }
    static create(id) {
        if (id) {
            if (!id.startsWith('cat_')) {
                throw new Error('CategoryId must start with "cat_"');
            }
            return new CategoryId(id);
        }
        const generated = `cat_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
        return new CategoryId(generated);
    }
    static fromString(id) {
        return CategoryId.create(id);
    }
    getValue() {
        return this.value;
    }
    equals(other) {
        return this.value === other.value;
    }
    toString() {
        return this.value;
    }
}
//# sourceMappingURL=category-id.vo.js.map