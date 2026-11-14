import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Email } from '../../../../domain/value-objects/email.js';
import { Password } from '../../../../domain/value-objects/password.js';
import { Role } from '../../../../domain/value-objects/role.js';
import { VinculationType } from '../../../../domain/value-objects/vinculation-type.js';
import { User } from '../../../../domain/entities/user.js';
import type { PasswordHasher } from '../../../../domain/ports/password-hasher.js';
import type { UserRepository } from '../../../../domain/ports/user.repository.js';

@Injectable()
export class AdminSeed implements OnApplicationBootstrap {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const emailInput = process.env.ADMIN_EMAIL;
    const passwordInput = process.env.ADMIN_PASSWORD;
    if (!emailInput && !passwordInput) return;
    if (!emailInput || !passwordInput) {
      throw new Error(
        'ADMIN_EMAIL and ADMIN_PASSWORD must both be configured to seed an administrator',
      );
    }

    const email = Email.create(
      emailInput,
      process.env.INSTITUTIONAL_EMAIL_DOMAIN ?? 'correounivalle.edu.co',
    );
    const existing = await this.users.findByEmail(email.value);
    if (existing) {
      if (existing.role !== 'ADMIN') {
        throw new Error(
          'ADMIN_EMAIL already belongs to a non-administrator account',
        );
      }
      return;
    }

    const password = Password.create(passwordInput);
    const user = User.register({
      id: randomUUID(),
      email,
      firstName: 'Administrador',
      lastName: 'Univalle',
      passwordHash: await this.passwordHasher.hash(password.value),
      vinculationType: VinculationType.create('ADMINISTRATIVO'),
    });
    user.changeRole(Role.create('ADMIN'), 'admin-seed');
    user.verifyEmail();
    await this.users.save(user);
  }
}
