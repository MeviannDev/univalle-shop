import {
  AuthenticationError,
  ValidationError,
} from '../../../users/domain/exceptions/domain-error.js';
import { Email } from '../../../users/domain/value-objects/email.js';
import { UserData } from '../../../users/domain/entities/user.js';
import { PasswordHasher } from '../../../users/domain/ports/password-hasher.js';
import { UserRepository } from '../../../users/domain/ports/user.repository.js';
import { TokenService } from '../../domain/ports/token.service.js';

export class Login {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly institutionalDomain = 'correounivalle.edu.co',
  ) {}

  async execute(
    emailInput: string,
    password: string,
  ): Promise<{ accessToken: string; user: Omit<UserData, 'passwordHash'> }> {
    let email: Email;
    try {
      email = Email.create(emailInput, this.institutionalDomain);
    } catch (error) {
      if (error instanceof ValidationError)
        throw new AuthenticationError('Invalid credentials');
      throw error;
    }
    const user = await this.users.findByEmail(email.value);
    if (
      !user ||
      !(await this.passwordHasher.compare(password, user.passwordHash))
    ) {
      throw new AuthenticationError('Invalid credentials');
    }
    user.assertCanLogin();
    const accessToken = await this.tokens.issueAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return { accessToken, user: user.toProfile() };
  }
}
