import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AuthenticationError } from '../../../../../users/domain/exceptions/domain-error.js';
import {
  AccessTokenClaims,
  TokenService,
  VerificationTokenClaims,
} from '../../../../domain/ports/token.service.js';

interface JwtPayload {
  sub?: unknown;
  email?: unknown;
  role?: unknown;
  purpose?: unknown;
  iat?: unknown;
  exp?: unknown;
  iss?: unknown;
}

@Injectable()
export class JwtTokenService implements TokenService {
  constructor(private readonly secret: string) {}

  async issueAccessToken(claims: AccessTokenClaims): Promise<string> {
    return this.sign({ ...claims, iss: 'users-service' }, 60 * 60);
  }

  async issueVerificationToken(
    claims: VerificationTokenClaims,
  ): Promise<string> {
    return this.sign({ ...claims, iss: 'users-service' }, 24 * 60 * 60);
  }

  async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    const payload = this.verify(token);
    if (
      payload.purpose !== undefined ||
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string'
    ) {
      throw new AuthenticationError('Invalid or expired access token');
    }
    if (payload.role !== 'ADMIN' && payload.role !== 'CUSTOMER') {
      throw new AuthenticationError('Invalid or expired access token');
    }
    return { sub: payload.sub, email: payload.email, role: payload.role };
  }

  async verifyVerificationToken(
    token: string,
  ): Promise<VerificationTokenClaims> {
    const payload = this.verify(token);
    if (
      payload.purpose !== 'email-verification' ||
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string'
    ) {
      throw new AuthenticationError('Verification link is invalid or expired');
    }
    return {
      sub: payload.sub,
      email: payload.email,
      purpose: 'email-verification',
    };
  }

  private sign(
    claims: Omit<JwtPayload, 'iat' | 'exp'>,
    lifetimeSeconds: number,
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const header = this.encode({ alg: 'HS256', typ: 'JWT' });
    const payload = this.encode({
      ...claims,
      iat: now,
      exp: now + lifetimeSeconds,
    });
    const input = `${header}.${payload}`;
    const signature = createHmac('sha256', this.secret)
      .update(input)
      .digest('base64url');
    return `${input}.${signature}`;
  }

  private verify(token: string): JwtPayload {
    const parts = token.split('.');
    if (parts.length !== 3)
      throw new AuthenticationError('Invalid or expired token');
    const [headerPart, payloadPart, signature] = parts;
    if (!headerPart || !payloadPart || !signature)
      throw new AuthenticationError('Invalid or expired token');

    const input = `${headerPart}.${payloadPart}`;
    const expected = createHmac('sha256', this.secret).update(input).digest();
    const provided = Buffer.from(signature, 'base64url');
    if (
      provided.length !== expected.length ||
      !timingSafeEqual(expected, provided)
    ) {
      throw new AuthenticationError('Invalid or expired token');
    }

    let header: { alg?: unknown };
    let payload: JwtPayload;
    try {
      header = JSON.parse(
        Buffer.from(headerPart, 'base64url').toString('utf8'),
      ) as { alg?: unknown };
      payload = JSON.parse(
        Buffer.from(payloadPart, 'base64url').toString('utf8'),
      ) as JwtPayload;
    } catch {
      throw new AuthenticationError('Invalid or expired token');
    }
    const now = Math.floor(Date.now() / 1000);
    if (
      header.alg !== 'HS256' ||
      typeof payload.exp !== 'number' ||
      payload.exp <= now ||
      payload.iss !== 'users-service'
    ) {
      throw new AuthenticationError('Invalid or expired token');
    }
    return payload;
  }

  private encode(value: object): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }
}
