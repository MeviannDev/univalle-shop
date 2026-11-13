export class Stock {
  private constructor(
    private readonly available: number,
    private readonly reserved: number = 0,
  ) {
    if (!Number.isInteger(available) || available < 0) {
      throw new Error('Available stock must be a non-negative integer');
    }
    if (!Number.isInteger(reserved) || reserved < 0) {
      throw new Error('Reserved stock must be a non-negative integer');
    }
  }

  static create(available: number, reserved: number = 0): Stock {
    return new Stock(available, reserved);
  }

  getAvailable(): number {
    return this.available;
  }

  getReserved(): number {
    return this.reserved;
  }

  getTotal(): number {
    return this.available + this.reserved;
  }

  canReserve(quantity: number): boolean {
    return this.available >= quantity;
  }

  reserve(quantity: number): Stock {
    if (!this.canReserve(quantity)) {
      throw new Error(`Insufficient stock. Available: ${this.available}, requested: ${quantity}`);
    }
    return new Stock(this.available - quantity, this.reserved + quantity);
  }

  release(quantity: number): Stock {
    if (this.reserved < quantity) {
      throw new Error(`Cannot release more than reserved. Reserved: ${this.reserved}, requested: ${quantity}`);
    }
    return new Stock(this.available + quantity, this.reserved - quantity);
  }

  commit(quantity: number): Stock {
    if (this.reserved < quantity) {
      throw new Error(`Cannot commit more than reserved. Reserved: ${this.reserved}, requested: ${quantity}`);
    }
    return new Stock(this.available, this.reserved - quantity);
  }

  equals(other: Stock): boolean {
    return this.available === other.available && this.reserved === other.reserved;
  }
}