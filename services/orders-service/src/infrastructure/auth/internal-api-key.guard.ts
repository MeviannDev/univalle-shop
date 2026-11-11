import { createHash, timingSafeEqual } from 'node:crypto';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.header('x-internal-api-key') ?? '';
    const expected = this.config.getOrThrow<string>('INTERNAL_SERVICE_API_KEY');
    const providedHash = createHash('sha256').update(provided).digest();
    const expectedHash = createHash('sha256').update(expected).digest();
    if (!provided || !timingSafeEqual(providedHash, expectedHash)) {
      throw new UnauthorizedException('API key interna inválida');
    }
    return true;
  }
}
