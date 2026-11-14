import { Module } from '@nestjs/common';
import { TOKEN_SERVICE } from './domain/ports/token.service.js';
import { JwtTokenService } from './infrastructure/adapters/out/jwt/jwt-token.service.js';
import { JwtAuthGuard } from './infrastructure/adapters/in/http/guards/jwt-auth.guard.js';
import { RolesGuard } from './infrastructure/adapters/in/http/guards/roles.guard.js';

function getJwtSecret(): string {
  const secret =
    process.env.JWT_SECRET ?? 'development-only-secret-change-before-deploy-32';
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be configured in production');
  }
  if (Buffer.byteLength(secret) < 32)
    throw new Error('JWT_SECRET must contain at least 32 bytes');
  return secret;
}

@Module({
  providers: [
    {
      provide: TOKEN_SERVICE,
      useFactory: () => new JwtTokenService(getJwtSecret()),
    },
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [TOKEN_SERVICE, JwtAuthGuard, RolesGuard],
})
export class AuthSecurityModule {}
