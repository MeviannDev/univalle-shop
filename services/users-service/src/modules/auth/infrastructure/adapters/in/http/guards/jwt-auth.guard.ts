import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticationError } from '../../../../../../users/domain/exceptions/domain-error.js';
import { TOKEN_SERVICE } from '../../../../../domain/ports/token.service.js';
import type { TokenService } from '../../../../../domain/ports/token.service.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(TOKEN_SERVICE) private readonly tokens: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: Awaited<ReturnType<TokenService['verifyAccessToken']>>;
    }>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer '))
      throw new UnauthorizedException('Bearer token is required');

    try {
      request.user = await this.tokens.verifyAccessToken(
        authorization.slice(7),
      );
      return true;
    } catch (error) {
      if (error instanceof AuthenticationError)
        throw new UnauthorizedException('Invalid or expired access token');
      throw error;
    }
  }
}
