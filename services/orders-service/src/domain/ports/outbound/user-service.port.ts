import type { UserId } from '../../value-objects/user-id.js';

export const USER_SERVICE = Symbol('USER_SERVICE');

export type UserRole = 'STUDENT' | 'TEACHER' | 'STAFF' | 'ADMIN';

export type AuthenticatedUser = {
  userId: UserId;
  role: UserRole;
  active: boolean;
  univalleAffiliation: 'STUDENT' | 'TEACHER' | 'STAFF';
};

export type UserSummary = {
  userId: UserId;
  role: UserRole;
  active: boolean;
};

export interface UserServicePort {
  validateToken(token: string): Promise<AuthenticatedUser>;
  getBasicUser(userId: UserId): Promise<UserSummary>;
}
