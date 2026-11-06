import { UserRepository } from '../../domain/ports/user.repository.js';
import { Role } from '../../domain/value-objects/role.js';
import { ChangeRoleCommand } from '../dto/user-commands.js';
import { requireAdmin, requireUser } from './user-helpers.js';

export class ChangeUserRole {
  constructor(private readonly users: UserRepository) {}
  async execute(command: ChangeRoleCommand) {
    requireAdmin(command.actorRole);
    const user = await requireUser(this.users, command.userId);
    user.changeRole(Role.create(command.role), command.actorId);
    await this.users.save(user);
    return user.toProfile();
  }
}
