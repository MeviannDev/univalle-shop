import { AuthenticationError } from '../../domain/exceptions/domain-error.js';
import { PasswordHasher } from '../../domain/ports/password-hasher.js';
import { UserRepository } from '../../domain/ports/user.repository.js';
import { Password } from '../../domain/value-objects/password.js';
import { requireUser } from './user-helpers.js';

export class ChangePassword {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}
  async execute(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await requireUser(this.users, userId);
    if (
      !(await this.passwordHasher.compare(currentPassword, user.passwordHash))
    ) {
      throw new AuthenticationError('Current password is incorrect');
    }
    user.changePassword(
      await this.passwordHasher.hash(Password.create(newPassword).value),
    );
    await this.users.save(user);
  }
}
