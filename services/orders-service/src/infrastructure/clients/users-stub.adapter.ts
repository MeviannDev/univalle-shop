import { Injectable } from '@nestjs/common';
import type {
  AuthenticatedUser,
  UserServicePort,
  UserSummary,
} from '../../domain/ports/outbound/user-service.port.js';
import { InvalidUserTokenError } from '../../domain/errors/invalid-user-token.error.js';
import { UserId } from '../../domain/value-objects/user-id.js';
import { JwtTokenVerifier } from '../auth/jwt-token-verifier.js';

@Injectable()
export class UsersStubAdapter implements UserServicePort {
  constructor(private readonly verifier: JwtTokenVerifier) {}

  async validateToken(token: string): Promise<AuthenticatedUser> {
    let claims;
    try {
      claims = this.verifier.verify(token);
    } catch {
      throw new InvalidUserTokenError();
    }
    if (!['test-customer', 'test-customer-2', 'test-admin'].includes(claims.sub)) {
      throw new InvalidUserTokenError();
    }
    return {
      userId: new UserId(claims.sub),
      role: claims.role,
      active: true,
    };
  }

  async getBasicUser(userId: UserId): Promise<UserSummary> {
    return {
      userId,
      role: userId.value === 'test-admin' ? 'ADMIN' : 'CUSTOMER',
      active: true,
    };
  }
}
