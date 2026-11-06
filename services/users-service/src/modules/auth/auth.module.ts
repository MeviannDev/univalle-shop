import { Module } from '@nestjs/common';
import { Login } from './application/use-cases/login.js';
import { VerifyEmail } from './application/use-cases/verify-email.js';
import { EMAIL_SENDER, EmailSender } from './domain/ports/email.sender.js';
import { TOKEN_SERVICE } from './domain/ports/token.service.js';
import { AuthSecurityModule } from './auth-security.module.js';
import { AuthController } from './infrastructure/adapters/in/http/controllers/auth.controller.js';
import nodemailer from 'nodemailer';
import { SmtpEmailSender } from './infrastructure/adapters/out/email/smtp-email.sender.js';
import { RegisterUser } from '../users/application/use-cases/register-user.js';
import {
  PASSWORD_HASHER,
  PasswordHasher,
} from '../users/domain/ports/password-hasher.js';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../users/domain/ports/user.repository.js';
import { UsersModule } from '../users/users.module.js';
import { TokenService } from './domain/ports/token.service.js';

@Module({
  imports: [UsersModule, AuthSecurityModule],
  controllers: [AuthController],
  providers: [
    {
      provide: EMAIL_SENDER,
      useFactory: () => {
        const port = Number(process.env.SMTP_PORT ?? 1025);
        const user = process.env.SMTP_USER;
        const password = process.env.SMTP_PASSWORD;

        if (!!user !== !!password) {
          throw new Error(
            'SMTP_USER and SMTP_PASSWORD must both be configured',
          );
        }

        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST ?? '127.0.0.1',
          port,
          secure: process.env.SMTP_SECURE === 'true' || port === 465,
          ...(user && password ? { auth: { user, pass: password } } : {}),
        });

        return new SmtpEmailSender(
          transporter,
          process.env.SMTP_FROM ?? 'Univalle Shop <no-reply@univalle.local>',
        );
      },
    },
    {
      provide: RegisterUser,
      inject: [USER_REPOSITORY, PASSWORD_HASHER, TOKEN_SERVICE, EMAIL_SENDER],
      useFactory: (
        users: UserRepository,
        hasher: PasswordHasher,
        tokens: TokenService,
        sender: EmailSender,
      ) =>
        new RegisterUser(
          users,
          hasher,
          tokens,
          sender,
          process.env.INSTITUTIONAL_EMAIL_DOMAIN ?? 'correounivalle.edu.co',
          process.env.USERS_SERVICE_URL ??
            `http://localhost:${process.env.PORT ?? 3002}`,
        ),
    },
    {
      provide: VerifyEmail,
      inject: [USER_REPOSITORY, TOKEN_SERVICE],
      useFactory: (users: UserRepository, tokens: TokenService) =>
        new VerifyEmail(users, tokens),
    },
    {
      provide: Login,
      inject: [USER_REPOSITORY, PASSWORD_HASHER, TOKEN_SERVICE],
      useFactory: (
        users: UserRepository,
        hasher: PasswordHasher,
        tokens: TokenService,
      ) =>
        new Login(
          users,
          hasher,
          tokens,
          process.env.INSTITUTIONAL_EMAIL_DOMAIN ?? 'correounivalle.edu.co',
        ),
    },
  ],
})
export class AuthModule {}
