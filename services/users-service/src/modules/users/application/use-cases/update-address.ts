import { UserRepository } from '../../domain/ports/user.repository.js';
import { UpdateAddressCommand } from '../dto/user-commands.js';
import { requireUser } from './user-helpers.js';

export class UpdateAddress {
  constructor(private readonly users: UserRepository) {}
  async execute(
    userId: string,
    addressId: string,
    changes: UpdateAddressCommand,
  ) {
    const user = await requireUser(this.users, userId);
    user.updateAddress(addressId, changes);
    await this.users.save(user);
    return user.addresses;
  }
}
