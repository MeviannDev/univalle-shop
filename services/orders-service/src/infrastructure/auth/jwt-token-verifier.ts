import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UserRole } from '../../domain/ports/outbound/user-service.port.js';

export type JwtClaims = {
  sub: string;
  email?: string;
  role: UserRole;
  iss: 'users-service';
  iat: number;
  exp: number;
};

@Injectable()
export class JwtTokenVerifier {
  constructor(private readonly config: ConfigService) {}

  verify(token: string): JwtClaims {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Formato JWT inválido');
    }
    const [encodedHeader, encodedPayload, signature] = parts;
    const header = this.decodeJson<{ alg?: string; typ?: string }>(encodedHeader!);
    if (header.alg !== 'HS256' || header.typ !== 'JWT') {
      throw new Error('Algoritmo JWT no permitido');
    }
    const secret = this.config.getOrThrow<string>('JWT_SECRET');
    const expected = createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest();
    const actual = Buffer.from(signature!, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new Error('Firma JWT inválida');
    }

    const claims = this.decodeJson<JwtClaims>(encodedPayload!);
    const now = Math.floor(Date.now() / 1000);
    if (
      claims.iss !== 'users-service' ||
      typeof claims.sub !== 'string' ||
      !claims.sub.trim() ||
      !['ADMIN', 'CUSTOMER'].includes(claims.role) ||
      !Number.isSafeInteger(claims.exp) ||
      claims.exp <= now ||
      !Number.isSafeInteger(claims.iat) ||
      claims.iat > now + 60
    ) {
      throw new Error('Claims JWT inválidos o expirados');
    }
    return claims;
  }

  signDevelopmentToken(subject: string, role: UserRole): string {
    if (this.config.get('NODE_ENV') === 'production') {
      throw new Error('La emisión de tokens de desarrollo está deshabilitada');
    }
    const now = Math.floor(Date.now() / 1000);
    const header = this.encode({ alg: 'HS256', typ: 'JWT' });
    const payload = this.encode({
      sub: subject,
      email: `${subject}@example.local`,
      role,
      iss: 'users-service',
      iat: now,
      exp: now + 3600,
    });
    const signature = createHmac('sha256', this.config.getOrThrow<string>('JWT_SECRET'))
      .update(`${header}.${payload}`)
      .digest('base64url');
    return `${header}.${payload}.${signature}`;
  }

  private decodeJson<T>(value: string): T {
    try {
      return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
    } catch (error) {
      throw new Error('JWT contiene JSON inválido', { cause: error });
    }
  }

  private encode(value: object): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }
}
