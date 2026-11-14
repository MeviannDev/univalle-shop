import { AuthenticationError } from '../../../users/domain/exceptions/domain-error.js';
import { UserRepository } from '../../../users/domain/ports/user.repository.js';
import { TokenService } from '../../domain/ports/token.service.js';

export class VerifyEmail {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: TokenService,
  ) {}

  async execute(token: string): Promise<{ verified: true }> {
    const claims = await this.tokens.verifyVerificationToken(token);
    const user = await this.users.findById(claims.sub);
    if (
      !user ||
      user.email !== claims.email ||
      user.status !== 'PENDING_VERIFICATION'
    ) {
      throw new AuthenticationError('Verification link is invalid or expired');
    }
    user.verifyEmail();
    await this.users.save(user);
    return { verified: true };
  }
}
