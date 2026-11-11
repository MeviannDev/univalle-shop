import type { AuthenticatedUser, UserServicePort } from '../../domain/ports/outbound/user-service.port.js';
import { InvalidUserTokenError } from '../../domain/errors/invalid-user-token.error.js';
import { ExternalServiceUnavailableError } from '../errors/external-service-unavailable.error.js';
import { ForbiddenAccessError } from '../errors/forbidden-access.error.js';
import { ForbiddenOrderAccessError } from '../errors/forbidden-order-access.error.js';
import { UnauthorizedError } from '../errors/unauthorized.error.js';

export async function authenticate(
  users: UserServicePort,
  token: string,
): Promise<AuthenticatedUser> {
  if (!token.trim()) {
    throw new UnauthorizedError();
  }
  let user: AuthenticatedUser;
  try {
    user = await users.validateToken(token);
  } catch (error) {
    if (error instanceof InvalidUserTokenError) {
      throw new UnauthorizedError();
    }
    throw new ExternalServiceUnavailableError('Usuarios', error);
  }
  if (!user.active) {
    throw new ForbiddenAccessError();
  }
  return user;
}

export async function authorizeAdmin(
  users: UserServicePort,
  token: string,
): Promise<AuthenticatedUser> {
  const user = await authenticate(users, token);
  if (user.role !== 'ADMIN') {
    throw new ForbiddenAccessError();
  }
  return user;
}

export function assertOrderOwnerOrAdmin(
  user: AuthenticatedUser,
  ownerUserId: string,
): void {
  if (user.role !== 'ADMIN' && user.userId.value !== ownerUserId) {
    throw new ForbiddenOrderAccessError();
  }
}
