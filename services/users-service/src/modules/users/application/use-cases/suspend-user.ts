import { UserRepository } from '../../domain/ports/user.repository.js';
import { RoleValue } from '../../domain/value-objects/role.js';
import { requireAdmin, requireUser } from './user-helpers.js';

export class SuspendUser {
  constructor(private readonly users: UserRepository) {}
  async execute(userId: string, actorId: string, actorRole: RoleValue) {
    requireAdmin(actorRole);
    const user = await requireUser(this.users, userId);
    user.suspendBy(actorId);
    await this.users.save(user);
    return user.toProfile();
  }
}
