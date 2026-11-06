import { UserRepository } from '../../domain/ports/user.repository.js';
import { RoleValue } from '../../domain/value-objects/role.js';
import { requireAdmin } from './user-helpers.js';

export class ListUsers {
  constructor(private readonly users: UserRepository) {}
  async execute(actorRole: RoleValue) {
    requireAdmin(actorRole);
    return (await this.users.findAll()).map((user) => user.toProfile());
  }
}
