import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../../domain/ports/outbound/user-service.port.js';

export const ROLES_KEY = 'orders:roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
