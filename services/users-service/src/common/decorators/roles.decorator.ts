import { SetMetadata } from '@nestjs/common';
import { RoleValue } from '../../modules/users/domain/value-objects/role.js';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RoleValue[]) => SetMetadata(ROLES_KEY, roles);
