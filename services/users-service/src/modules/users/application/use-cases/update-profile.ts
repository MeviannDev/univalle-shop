import { UserRepository } from '../../domain/ports/user.repository.js';
import { VinculationType } from '../../domain/value-objects/vinculation-type.js';
import { UpdateProfileCommand } from '../dto/user-commands.js';
import { requireUser } from './user-helpers.js';

export class UpdateProfile {
  constructor(private readonly users: UserRepository) {}
  async execute(userId: string, changes: UpdateProfileCommand) {
    const user = await requireUser(this.users, userId);
    user.updateProfile({
      firstName: changes.firstName,
      lastName: changes.lastName,
      ...(changes.vinculationType
        ? { vinculationType: VinculationType.create(changes.vinculationType) }
        : {}),
    });
    await this.users.save(user);
    return user.toProfile();
  }
}
