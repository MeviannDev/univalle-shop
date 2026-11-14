import { Module } from '@nestjs/common';
import { AuthSecurityModule } from '../auth/auth-security.module.js';
import { AddAddress } from './application/use-cases/add-address.js';
import { ActivateUser } from './application/use-cases/activate-user.js';
import { ChangePassword } from './application/use-cases/change-password.js';
import { ChangeUserRole } from './application/use-cases/change-user-role.js';
import { GetProfile } from './application/use-cases/get-profile.js';
import { ListUsers } from './application/use-cases/list-users.js';
import { RemoveAddress } from './application/use-cases/remove-address.js';
import { SetDefaultAddress } from './application/use-cases/set-default-address.js';
import { SuspendUser } from './application/use-cases/suspend-user.js';
import { UpdateAddress } from './application/use-cases/update-address.js';
import { UpdateProfile } from './application/use-cases/update-profile.js';
import { PASSWORD_HASHER } from './domain/ports/password-hasher.js';
import { USER_REPOSITORY } from './domain/ports/user.repository.js';
import { UsersController } from './infrastructure/adapters/in/http/controllers/users.controller.js';
import { AdminSeed } from './infrastructure/adapters/out/persistence/admin-seed.js';
import { InMemoryUserRepository } from './infrastructure/adapters/out/persistence/in-memory-user.repository.js';
import {
  MONGO_DATABASE,
  MongoModule,
} from './infrastructure/adapters/out/persistence/mongo.module.js';
import { MongoUserRepository } from './infrastructure/adapters/out/persistence/mongo-user.repository.js';
import { Argon2PasswordHasher } from './infrastructure/adapters/out/security/argon2-password-hasher.js';

const userUseCaseProviders = [
  {
    provide: GetProfile,
    useFactory: (users: ConstructorParameters<typeof GetProfile>[0]) =>
      new GetProfile(users),
    inject: [USER_REPOSITORY],
  },
  {
    provide: UpdateProfile,
    useFactory: (users: ConstructorParameters<typeof UpdateProfile>[0]) =>
      new UpdateProfile(users),
    inject: [USER_REPOSITORY],
  },
  {
    provide: ChangePassword,
    useFactory: (
      users: ConstructorParameters<typeof ChangePassword>[0],
      hasher: ConstructorParameters<typeof ChangePassword>[1],
    ) => new ChangePassword(users, hasher),
    inject: [USER_REPOSITORY, PASSWORD_HASHER],
  },
  {
    provide: AddAddress,
    useFactory: (users: ConstructorParameters<typeof AddAddress>[0]) =>
      new AddAddress(users),
    inject: [USER_REPOSITORY],
  },
  {
    provide: UpdateAddress,
    useFactory: (users: ConstructorParameters<typeof UpdateAddress>[0]) =>
      new UpdateAddress(users),
    inject: [USER_REPOSITORY],
  },
  {
    provide: RemoveAddress,
    useFactory: (users: ConstructorParameters<typeof RemoveAddress>[0]) =>
      new RemoveAddress(users),
    inject: [USER_REPOSITORY],
  },
  {
    provide: SetDefaultAddress,
    useFactory: (users: ConstructorParameters<typeof SetDefaultAddress>[0]) =>
      new SetDefaultAddress(users),
    inject: [USER_REPOSITORY],
  },
  {
    provide: ListUsers,
    useFactory: (users: ConstructorParameters<typeof ListUsers>[0]) =>
      new ListUsers(users),
    inject: [USER_REPOSITORY],
  },
  {
    provide: SuspendUser,
    useFactory: (users: ConstructorParameters<typeof SuspendUser>[0]) =>
      new SuspendUser(users),
    inject: [USER_REPOSITORY],
  },
  {
    provide: ActivateUser,
    useFactory: (users: ConstructorParameters<typeof ActivateUser>[0]) =>
      new ActivateUser(users),
    inject: [USER_REPOSITORY],
  },
  {
    provide: ChangeUserRole,
    useFactory: (users: ConstructorParameters<typeof ChangeUserRole>[0]) =>
      new ChangeUserRole(users),
    inject: [USER_REPOSITORY],
  },
];

@Module({
  imports: [MongoModule, AuthSecurityModule],
  controllers: [UsersController],
  providers: [
    {
      provide: USER_REPOSITORY,
      inject: [MONGO_DATABASE],
      useFactory: async (
        database: ConstructorParameters<typeof MongoUserRepository>[0] | null,
      ) => {
        const institutionalDomain =
          process.env.INSTITUTIONAL_EMAIL_DOMAIN ?? 'correounivalle.edu.co';
        if (!database) return new InMemoryUserRepository(institutionalDomain);
        const collection = database.collection('users');
        await collection.createIndex({ id: 1 }, { unique: true });
        await collection.createIndex({ email: 1 }, { unique: true });
        return new MongoUserRepository(database, institutionalDomain);
      },
    },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    ...userUseCaseProviders,
    {
      provide: AdminSeed,
      inject: [USER_REPOSITORY, PASSWORD_HASHER],
      useFactory: (
        users: ConstructorParameters<typeof AdminSeed>[0],
        hasher: ConstructorParameters<typeof AdminSeed>[1],
      ) => new AdminSeed(users, hasher),
    },
  ],
  exports: [USER_REPOSITORY, PASSWORD_HASHER],
})
export class UsersModule {}
