import { Injectable } from '@nestjs/common';
import type {
  AuthenticatedUser,
  UserServicePort,
  UserSummary,
} from '../../domain/ports/outbound/user-service.port.js';
import { UserId } from '../../domain/value-objects/user-id.js';
import { JwtTokenVerifier } from '../auth/jwt-token-verifier.js';
import { adaptCall, asRecord, requiredString } from './external-error.mapper.js';
import { HttpServiceClient } from './http-service-client.js';

@Injectable()
export class UsersHttpAdapter implements UserServicePort {
  constructor(
    private readonly http: HttpServiceClient,
    private readonly verifier: JwtTokenVerifier,
  ) {}

  async validateToken(token: string): Promise<AuthenticatedUser> {
    const claims = this.verifier.verify(token);
    const profile = await adaptCall('Usuarios', async () =>
      asRecord(
        await this.http.request('users', '/api/users/me', {
          token,
          idempotent: true,
        }),
      ),
    );
    const role = requiredString(profile.role, 'role');
    const userId = requiredString(profile.id ?? profile.userId ?? profile.sub, 'userId');
    if (userId !== claims.sub || role !== claims.role) {
      throw new Error('Las claims JWT no coinciden con el perfil de Usuarios');
    }
    return {
      userId: new UserId(claims.sub),
      role: claims.role,
      active: profile.active === true || profile.status === 'ACTIVE',
    };
  }

  async getBasicUser(userId: UserId): Promise<UserSummary> {
    const profile = await adaptCall('Usuarios', async () =>
      asRecord(
        await this.http.request(
          'users',
          `/api/users/${encodeURIComponent(userId.value)}`,
          { idempotent: true },
        ),
      ),
    );
    const role = requiredString(profile.role, 'role');
    if (role !== 'ADMIN' && role !== 'CUSTOMER') {
      throw new Error('Rol inválido en respuesta de Usuarios');
    }
    return {
      userId: new UserId(requiredString(profile.id ?? profile.userId, 'userId')),
      role,
      active: profile.active === true || profile.status === 'ACTIVE',
    };
  }
}
