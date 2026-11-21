import { ValidationError } from '../exceptions/domain-error.js';

export class PhoneNumber {
  private constructor(readonly value: string) {}

  static create(value: string): PhoneNumber {
    const normalized = value.trim();
    if (!/^(?=.*\d)[+()\d\s-]{7,20}$/.test(normalized)) {
      throw new ValidationError('Primary phone number is invalid');
    }
    return new PhoneNumber(normalized);
  }
}
