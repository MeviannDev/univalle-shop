import { User } from '../../domain/entities/user.js';
import { UserRepository } from '../../domain/ports/user.repository.js';
import {
  ForbiddenOperationError,
  NotFoundError,
} from '../../domain/exceptions/domain-error.js';
import { RoleValue } from '../../domain/value-objects/role.js';

export async function requireUser(
  repository: UserRepository,
  userId: string,
): Promise<User> {
  const user = await repository.findById(userId);
  if (!user) throw new NotFoundError('User not found');
  return user;
}

export function requireAdmin(role: RoleValue): void {
  if (role !== 'ADMIN') {
    throw new ForbiddenOperationError(
      'Only administrators can perform this operation',
    );
  }
}
