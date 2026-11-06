import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AccessTokenClaims } from '../../modules/auth/domain/ports/token.service.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AccessTokenClaims =>
    context.switchToHttp().getRequest<{ user: AccessTokenClaims }>().user,
);
