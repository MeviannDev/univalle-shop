import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserStatusDto {
  @ApiProperty({
    description: 'Nuevo estado de la cuenta.',
    enum: ['ACTIVE', 'SUSPENDED'],
    example: 'SUSPENDED',
  })
  @IsEnum(['ACTIVE', 'SUSPENDED'])
  status!: 'ACTIVE' | 'SUSPENDED';
}

export class ChangeUserRoleDto {
  @ApiProperty({
    description: 'Rol que se asignará a la cuenta.',
    enum: ['CUSTOMER', 'ADMIN'],
    example: 'CUSTOMER',
  })
  @IsEnum(['CUSTOMER', 'ADMIN'])
  role!: 'CUSTOMER' | 'ADMIN';
}
