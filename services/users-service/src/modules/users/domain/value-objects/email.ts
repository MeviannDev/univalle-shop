import { ValidationError } from '../exceptions/domain-error.js';

const DEFAULT_INSTITUTIONAL_DOMAIN = 'correounivalle.edu.co';

export class Email {
  private constructor(readonly value: string) {}

  static create(
    value: string,
    institutionalDomain = DEFAULT_INSTITUTIONAL_DOMAIN,
  ): Email {
    const normalized = value.trim().toLowerCase();
    const domain = institutionalDomain.trim().toLowerCase().replace(/^@/, '');
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalized) || !normalized.endsWith(`@${domain}`)) {
      throw new ValidationError(
        `Email must use the @${domain} institutional domain`,
      );
    }

    return new Email(normalized);
  }

  toString(): string {
    return this.value;
  }
}
