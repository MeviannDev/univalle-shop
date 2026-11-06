import { ValidationError } from '../exceptions/domain-error.js';

export type RoleValue = 'CUSTOMER' | 'ADMIN';

export class Role {
  private constructor(readonly value: RoleValue) {}

  static create(value: string): Role {
    if (value !== 'CUSTOMER' && value !== 'ADMIN') {
      throw new ValidationError('Role must be CUSTOMER or ADMIN');
    }
    return new Role(value);
  }

  static customer(): Role {
    return new Role('CUSTOMER');
  }
}
