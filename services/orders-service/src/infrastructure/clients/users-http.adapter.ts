import { Injectable } from '@nestjs/common';
import type {
  AuthenticatedUser,
  UserServicePort,
} from '../../domain/ports/outbound/user-service.port.js';
import { InvalidUserTokenError } from '../../domain/errors/invalid-user-token.error.js';
import { UserId } from '../../domain/value-objects/user-id.js';
import { InvalidDependencyResponseError } from '../../application/errors/invalid-dependency-response.error.js';
import { JwtTokenVerifier, type JwtClaims } from '../auth/jwt-token-verifier.js';
import {
  asRecord,
  mapExternalError,
  requiredString,
} from './external-error.mapper.js';
import { ExternalHttpError, HttpServiceClient } from './http-service-client.js';

@Injectable()
export class UsersHttpAdapter implements UserServicePort {
  constructor(
    private readonly http: HttpServiceClient,
    private readonly verifier: JwtTokenVerifier,
  ) {}

  async validateToken(token: string): Promise<AuthenticatedUser> {
    let claims: JwtClaims;
    try {
      claims = this.verifier.verify(token);
    } catch {
      throw new InvalidUserTokenError();
    }

    let profile: Record<string, unknown>;
    try {
      profile = asRecord(
        await this.http.request('users', '/users/me', {
          token,
          idempotent: true,
        }),
      );
    } catch (error) {
      if (error instanceof ExternalHttpError && [401, 404].includes(error.status)) {
        throw new InvalidUserTokenError();
      }
      throw mapExternalError('Usuarios', error);
    }

    const userId = requiredString(profile.id, 'id');
    const role = requiredString(profile.role, 'role');
    const status = requiredString(profile.status, 'status');
    if (userId !== claims.sub) {
      throw new InvalidUserTokenError();
    }
    if (role !== 'ADMIN' && role !== 'CUSTOMER') {
      throw new InvalidDependencyResponseError('Usuarios (role)');
    }
    if (!['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'].includes(status)) {
      throw new InvalidDependencyResponseError('Usuarios (status)');
    }

    return {
      userId: new UserId(userId),
      role,
      active: status === 'ACTIVE',
    };
  }
}
