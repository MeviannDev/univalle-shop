import { ProductId } from '../value-objects/product-id.vo.js';
import { Stock } from '../value-objects/stock.vo.js';
export class Product {
    props;
    constructor(props) {
        this.props = props;
    }
    static create(params) {
        const kind = params.kind ?? 'PRODUCT';
        const now = new Date();
        if (kind === 'PRODUCT' && (params.stock === undefined || params.stock < 0)) {
            throw new Error('PRODUCT must have a non-negative initial stock');
        }
        return new Product({
            id: ProductId.create(),
            name: params.name.trim(),
            description: params.description?.trim(),
            unitPrice: params.unitPrice,
            kind,
            categoryId: params.categoryId,
            stock: kind === 'PRODUCT' ? Stock.create(params.stock ?? 0) : undefined,
            available: true,
            createdAt: now,
            updatedAt: now,
        });
    }
    static reconstitute(props) {
        return new Product(props);
    }
    // Getters
    get id() { return this.props.id; }
    get name() { return this.props.name; }
    get description() { return this.props.description; }
    get unitPrice() { return this.props.unitPrice; }
    get kind() { return this.props.kind; }
    get categoryId() { return this.props.categoryId; }
    get stock() { return this.props.stock; }
    get available() { return this.props.available; }
    get createdAt() { return this.props.createdAt; }
    get updatedAt() { return this.props.updatedAt; }
    // Métodos de stock (los que Orders necesita)
    checkAvailability(quantity) {
        if (this.props.kind === 'SERVICE')
            return this.props.available;
        if (!this.props.stock)
            return false;
        return this.props.available && this.props.stock.canReserve(quantity);
    }
    reserveStock(quantity) {
        if (this.props.kind === 'SERVICE')
            throw new Error('Cannot reserve stock for a SERVICE');
        if (!this.props.stock)
            throw new Error('Product has no stock information');
        if (!this.props.available)
            throw new Error('Product is not available');
        this.props.stock = this.props.stock.reserve(quantity);
        this.props.updatedAt = new Date();
    }
    releaseStock(quantity) {
        if (this.props.kind === 'SERVICE')
            throw new Error('Cannot release stock for a SERVICE');
        if (!this.props.stock)
            throw new Error('Product has no stock information');
        this.props.stock = this.props.stock.release(quantity);
        this.props.updatedAt = new Date();
    }
    commitStock(quantity) {
        if (this.props.kind === 'SERVICE')
            throw new Error('Cannot commit stock for a SERVICE');
        if (!this.props.stock)
            throw new Error('Product has no stock information');
        this.props.stock = this.props.stock.commit(quantity);
        this.props.updatedAt = new Date();
    }
    updatePrice(unitPrice) {
        this.props.unitPrice = unitPrice;
        this.props.updatedAt = new Date();
    }
    activate() {
        this.props.available = true;
        this.props.updatedAt = new Date();
    }
    deactivate() {
        this.props.available = false;
        this.props.updatedAt = new Date();
    }
    // Para el contrato de Orders
    toOrderView() {
        return {
            productId: this.props.id.getValue(),
            name: this.props.name,
            unitPrice: this.props.unitPrice.getCents(),
            available: this.props.available,
            stock: this.props.stock?.getAvailable() ?? null,
        };
    }
}
//# sourceMappingURL=product.entity.js.map