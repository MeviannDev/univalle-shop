import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtTokenVerifier, type JwtClaims } from './jwt-token-verifier.js';

export type AuthenticatedRequest = Request & {
  user?: JwtClaims;
  accessToken?: string;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly verifier: JwtTokenVerifier) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Se requiere un token Bearer');
    }
    const token = authorization.slice('Bearer '.length).trim();
    try {
      request.user = this.verifier.verify(token);
      request.accessToken = token;
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
