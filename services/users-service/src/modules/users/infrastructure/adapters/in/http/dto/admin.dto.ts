import { IsEnum } from 'class-validator';

export class UpdateUserStatusDto {
  @IsEnum(['ACTIVE', 'SUSPENDED'])
  status!: 'ACTIVE' | 'SUSPENDED';
}

export class ChangeUserRoleDto {
  @IsEnum(['CUSTOMER', 'ADMIN'])
  role!: 'CUSTOMER' | 'ADMIN';
}
