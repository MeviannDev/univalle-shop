import { InvalidIdentifierError } from '../errors/invalid-identifier.error.js';

export abstract class Identifier {
  protected constructor(public readonly value: string) {
    if (!value.trim()) {
      throw new InvalidIdentifierError();
    }
  }

  equals(other: Identifier): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
