export class Stock {
    available;
    reserved;
    constructor(available, reserved = 0) {
        this.available = available;
        this.reserved = reserved;
        if (!Number.isInteger(available) || available < 0) {
            throw new Error('Available stock must be a non-negative integer');
        }
        if (!Number.isInteger(reserved) || reserved < 0) {
            throw new Error('Reserved stock must be a non-negative integer');
        }
    }
    static create(available, reserved = 0) {
        return new Stock(available, reserved);
    }
    getAvailable() {
        return this.available;
    }
    getReserved() {
        return this.reserved;
    }
    getTotal() {
        return this.available + this.reserved;
    }
    canReserve(quantity) {
        return this.available >= quantity;
    }
    reserve(quantity) {
        if (!this.canReserve(quantity)) {
            throw new Error(`Insufficient stock. Available: ${this.available}, requested: ${quantity}`);
        }
        return new Stock(this.available - quantity, this.reserved + quantity);
    }
    release(quantity) {
        if (this.reserved < quantity) {
            throw new Error(`Cannot release more than reserved. Reserved: ${this.reserved}, requested: ${quantity}`);
        }
        return new Stock(this.available + quantity, this.reserved - quantity);
    }
    commit(quantity) {
        if (this.reserved < quantity) {
            throw new Error(`Cannot commit more than reserved. Reserved: ${this.reserved}, requested: ${quantity}`);
        }
        return new Stock(this.available, this.reserved - quantity);
    }
    equals(other) {
        return this.available === other.available && this.reserved === other.reserved;
    }
}
//# sourceMappingURL=stock.vo.js.map