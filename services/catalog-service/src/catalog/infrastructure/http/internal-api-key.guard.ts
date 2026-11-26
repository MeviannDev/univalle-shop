import { createHash, timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.INTERNAL_SERVICE_API_KEY;
    if (!expected || Buffer.byteLength(expected) < 32) {
      throw new ServiceUnavailableException(
        'La autenticación interna de Catalog no está configurada.',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.header('x-internal-api-key') ?? '';
    const providedHash = createHash('sha256').update(provided).digest();
    const expectedHash = createHash('sha256').update(expected).digest();
    if (!provided || !timingSafeEqual(providedHash, expectedHash)) {
      throw new UnauthorizedException('API key interna inválida.');
    }
    return true;
  }
}
