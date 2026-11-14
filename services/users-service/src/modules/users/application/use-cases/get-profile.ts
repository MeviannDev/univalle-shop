import { UserRepository } from '../../domain/ports/user.repository.js';
import { requireUser } from './user-helpers.js';

export class GetProfile {
  constructor(private readonly users: UserRepository) {}
  async execute(userId: string) {
    return (await requireUser(this.users, userId)).toProfile();
  }
}
