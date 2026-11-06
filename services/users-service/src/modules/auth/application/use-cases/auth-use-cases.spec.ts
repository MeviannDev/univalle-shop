import { describe, expect, it } from 'vitest';
import { RegisterUser } from '../../../users/application/use-cases/register-user.js';
import { InMemoryUserRepository } from '../../../users/infrastructure/adapters/out/persistence/in-memory-user.repository.js';
import { Login } from './login.js';
import { VerifyEmail } from './verify-email.js';
import {
  AccessTokenClaims,
  TokenService,
  VerificationTokenClaims,
} from '../../domain/ports/token.service.js';
import { EmailSender } from '../../domain/ports/email.sender.js';
import { PasswordHasher } from '../../../users/domain/ports/password-hasher.js';
import { AuthenticationError } from '../../../users/domain/exceptions/domain-error.js';

class FakeHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return `fake-hash:${password.length}`;
  }
  async compare(password: string, passwordHash: string): Promise<boolean> {
    return passwordHash === `fake-hash:${password.length}`;
  }
}

class FakeTokens implements TokenService {
  private readonly verificationClaims = new Map<
    string,
    VerificationTokenClaims
  >();
  async issueAccessToken(claims: AccessTokenClaims): Promise<string> {
    return `access:${claims.sub}`;
  }
  async issueVerificationToken(
    claims: VerificationTokenClaims,
  ): Promise<string> {
    const token = `verify:${claims.sub}`;
    this.verificationClaims.set(token, claims);
    return token;
  }
  async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    throw new Error(`Not used in this test: ${token}`);
  }
  async verifyVerificationToken(
    token: string,
  ): Promise<VerificationTokenClaims> {
    const claims = this.verificationClaims.get(token);
    if (!claims)
      throw new AuthenticationError('Verification link is invalid or expired');
    return claims;
  }
}

class FakeEmailSender implements EmailSender {
  readonly links: string[] = [];
  async sendVerificationEmail(
    _email: string,
    verificationUrl: string,
  ): Promise<void> {
    this.links.push(verificationUrl);
  }
}

describe('Auth use cases', () => {
  it('emails a verification link without returning the verification token to the client', async () => {
    const repository = new InMemoryUserRepository();
    const hasher = new FakeHasher();
    const tokens = new FakeTokens();
    const sender = new FakeEmailSender();
    const register = new RegisterUser(
      repository,
      hasher,
      tokens,
      sender,
      'correounivalle.edu.co',
      'http://localhost:3002',
    );

    const result = await register.execute({
      email: 'ada@correounivalle.edu.co',
      firstName: 'Ada',
      lastName: 'Lovelace',
      password: 'Univalle1!',
      vinculationType: 'ESTUDIANTE',
    });

    expect(result.status).toBe('PENDING_VERIFICATION');
    expect(result).not.toHaveProperty('verificationUrl');
    expect(sender.links[0]).toMatch(
      /^http:\/\/localhost:3002\/auth\/verify-email\?token=verify%3A/,
    );
    expect(sender.links).toHaveLength(1);
    const user = await repository.findByEmail('ada@correounivalle.edu.co');
    expect(user?.role).toBe('CUSTOMER');
    expect(user?.passwordHash).not.toContain('Univalle1!');

    const token = new URL(sender.links[0]!).searchParams.get('token')!;
    await new VerifyEmail(repository, tokens).execute(token);
    expect(
      (await repository.findByEmail('ada@correounivalle.edu.co'))?.status,
    ).toBe('ACTIVE');

    await expect(
      new Login(repository, hasher, tokens).execute(
        'ada@correounivalle.edu.co',
        'Univalle1!',
      ),
    ).resolves.toMatchObject({ accessToken: `access:${result.id}` });
  });

  it('rejects login before email verification and never registers non-institutional email', async () => {
    const repository = new InMemoryUserRepository();
    const hasher = new FakeHasher();
    const tokens = new FakeTokens();
    const sender = new FakeEmailSender();
    const register = new RegisterUser(repository, hasher, tokens, sender);

    const registration = await register.execute({
      email: 'ada@correounivalle.edu.co',
      firstName: 'Ada',
      lastName: 'Lovelace',
      password: 'Univalle1!',
      vinculationType: 'ESTUDIANTE',
    });
    expect(registration).not.toHaveProperty('verificationUrl');
    await expect(
      new Login(repository, hasher, tokens).execute(
        'ada@correounivalle.edu.co',
        'Univalle1!',
      ),
    ).rejects.toThrow('Invalid credentials');
    await expect(
      register.execute({
        email: 'ada@gmail.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        password: 'Univalle1!',
        vinculationType: 'ESTUDIANTE',
      }),
    ).rejects.toThrow();
  });
});
