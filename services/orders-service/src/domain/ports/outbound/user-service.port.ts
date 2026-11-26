import type { UserId } from '../../value-objects/user-id.js';

export const USER_SERVICE = Symbol('USER_SERVICE');

export type UserRole = 'CUSTOMER' | 'ADMIN';

export type AuthenticatedUser = {
  userId: UserId;
  role: UserRole;
  active: boolean;
};

export interface UserServicePort {
  validateToken(token: string): Promise<AuthenticatedUser>;
}
