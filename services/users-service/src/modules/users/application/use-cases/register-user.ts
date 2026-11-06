import { randomUUID } from 'node:crypto';
import { Email } from '../../domain/value-objects/email.js';
import { Password } from '../../domain/value-objects/password.js';
import { VinculationType } from '../../domain/value-objects/vinculation-type.js';
import { User } from '../../domain/entities/user.js';
import { ConflictError } from '../../domain/exceptions/domain-error.js';
import { PasswordHasher } from '../../domain/ports/password-hasher.js';
import { UserRepository } from '../../domain/ports/user.repository.js';
import { EmailSender } from '../../../auth/domain/ports/email.sender.js';
import { TokenService } from '../../../auth/domain/ports/token.service.js';
import { RegisterUserCommand } from '../dto/user-commands.js';

export interface RegisterUserResult {
  id: string;
  status: string;
}

export class RegisterUser {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly emailSender: EmailSender,
    private readonly institutionalDomain = 'correounivalle.edu.co',
    private readonly verificationServiceUrl = 'http://localhost:3002',
  ) {}

  async execute(command: RegisterUserCommand): Promise<RegisterUserResult> {
    const email = Email.create(command.email, this.institutionalDomain);
    if (await this.users.findByEmail(email.value))
      throw new ConflictError('Email is already registered');

    const passwordHash = await this.passwordHasher.hash(
      Password.create(command.password).value,
    );
    const user = User.register({
      id: randomUUID(),
      email,
      firstName: command.firstName,
      lastName: command.lastName,
      passwordHash,
      vinculationType: VinculationType.create(command.vinculationType),
    });

    await this.users.save(user);
    const token = await this.tokens.issueVerificationToken({
      sub: user.id,
      email: user.email,
      purpose: 'email-verification',
    });
    const verificationUrl = `${this.verificationServiceUrl.replace(/\/$/, '')}/auth/verify-email?token=${encodeURIComponent(token)}`;
    await this.emailSender.sendVerificationEmail(user.email, verificationUrl);

    return {
      id: user.id,
      status: user.status,
    };
  }
}
