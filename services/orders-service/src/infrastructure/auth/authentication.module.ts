import { Module } from '@nestjs/common';
import { ServiceAdaptersModule } from '../adapters/service-adapters.module.js';
import { InternalApiKeyGuard } from './internal-api-key.guard.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RolesGuard } from './roles.guard.js';

@Module({
  imports: [ServiceAdaptersModule],
  providers: [JwtAuthGuard, RolesGuard, InternalApiKeyGuard],
  exports: [JwtAuthGuard, RolesGuard, InternalApiKeyGuard],
})
export class AuthenticationModule {}
