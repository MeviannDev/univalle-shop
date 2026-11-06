import { randomUUID } from 'node:crypto';
import { Address } from '../../domain/value-objects/address.js';
import { UserRepository } from '../../domain/ports/user.repository.js';
import { AddAddressCommand } from '../dto/user-commands.js';
import { requireUser } from './user-helpers.js';

export class AddAddress {
  constructor(private readonly users: UserRepository) {}
  async execute(userId: string, command: AddAddressCommand) {
    const user = await requireUser(this.users, userId);
    user.addAddress(
      Address.create({
        ...command,
        id: randomUUID(),
        isDefault: command.isDefault ?? false,
      }),
    );
    await this.users.save(user);
    return user.addresses;
  }
}
