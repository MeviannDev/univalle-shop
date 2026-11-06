import { Module } from '@nestjs/common';
import { Login } from './application/use-cases/login.js';
import { VerifyEmail } from './application/use-cases/verify-email.js';
import { EMAIL_SENDER } from './domain/ports/email.sender.js';
import { TOKEN_SERVICE } from './domain/ports/token.service.js';
import { AuthSecurityModule } from './auth-security.module.js';
import { AuthController } from './infrastructure/adapters/in/http/controllers/auth.controller.js';
import { ConsoleEmailSender } from './infrastructure/adapters/out/email/console-email.sender.js';
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
    { provide: EMAIL_SENDER, useClass: ConsoleEmailSender },
    {
      provide: RegisterUser,
      inject: [USER_REPOSITORY, PASSWORD_HASHER, TOKEN_SERVICE, EMAIL_SENDER],
      useFactory: (
        users: UserRepository,
        hasher: PasswordHasher,
        tokens: TokenService,
        sender: ConsoleEmailSender,
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
