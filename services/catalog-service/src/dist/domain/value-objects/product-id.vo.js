export class ProductId {
    value;
    constructor(value) {
        this.value = value;
    }
    static create(id) {
        if (id) {
            if (!id.startsWith('prod_')) {
                throw new Error('ProductId must start with "prod_"');
            }
            return new ProductId(id);
        }
        const generated = `prod_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
        return new ProductId(generated);
    }
    static fromString(id) {
        return ProductId.create(id);
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
//# sourceMappingURL=product-id.vo.js.map