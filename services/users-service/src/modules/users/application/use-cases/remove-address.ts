import { UserRepository } from '../../domain/ports/user.repository.js';
import { requireUser } from './user-helpers.js';

export class RemoveAddress {
  constructor(private readonly users: UserRepository) {}
  async execute(userId: string, addressId: string) {
    const user = await requireUser(this.users, userId);
    user.removeAddress(addressId);
    await this.users.save(user);
    return user.addresses;
  }
}
