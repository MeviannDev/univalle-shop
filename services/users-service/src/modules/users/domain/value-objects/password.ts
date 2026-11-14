import { ValidationError } from '../exceptions/domain-error.js';

export class Password {
  private constructor(readonly value: string) {}

  static create(value: string): Password {
    if (
      value.length < 8 ||
      !/[A-Z]/.test(value) ||
      !/[0-9]/.test(value) ||
      !/[^A-Za-z0-9\s]/.test(value)
    ) {
      throw new ValidationError(
        'Password must have at least 8 characters, an uppercase letter, a number, and a symbol',
      );
    }

    return new Password(value);
  }
}
