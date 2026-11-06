import { ValidationError } from '../exceptions/domain-error.js';

export type UserStatusValue = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED';

export class UserStatus {
  private constructor(readonly value: UserStatusValue) {}

  static create(value: string): UserStatus {
    if (!['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED'].includes(value)) {
      throw new ValidationError('Invalid user status');
    }
    return new UserStatus(value as UserStatusValue);
  }

  static pendingVerification(): UserStatus {
    return new UserStatus('PENDING_VERIFICATION');
  }
}
