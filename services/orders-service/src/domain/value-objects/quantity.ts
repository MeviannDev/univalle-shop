import { InvalidQuantityError } from '../errors/invalid-quantity.error.js';

export class Quantity {
  public static readonly DEFAULT_MAX = 99;

  constructor(
    public readonly value: number,
    public readonly max: number = Quantity.DEFAULT_MAX,
  ) {
    if (!Number.isSafeInteger(max) || max < 1 || !Number.isSafeInteger(value) || value < 1 || value > max) {
      throw new InvalidQuantityError(value, max);
    }
  }

  equals(other: Quantity): boolean {
    return this.value === other.value && this.max === other.max;
  }
}
