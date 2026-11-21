import { ApiProperty } from '@nestjs/swagger';

class UserAddressResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  street!: string;

  @ApiProperty()
  city!: string;

  @ApiProperty()
  department!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty()
  isDefault!: boolean;
}

export class UserProfileResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'ana.valencia@correounivalle.edu.co' })
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty({ type: String, nullable: true })
  primaryPhone!: string | null;

  @ApiProperty({ default: false })
  marketingConsent!: boolean;

  @ApiProperty({ type: Date, nullable: true })
  marketingConsentUpdatedAt!: Date | null;

  @ApiProperty({ enum: ['CUSTOMER', 'ADMIN'] })
  role!: string;

  @ApiProperty({ enum: ['ESTUDIANTE', 'DOCENTE', 'ADMINISTRATIVO'] })
  vinculationType!: string;

  @ApiProperty({ enum: ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED'] })
  status!: string;

  @ApiProperty({ type: () => UserAddressResponseDto, isArray: true })
  addresses!: UserAddressResponseDto[];

  @ApiProperty({ type: Date })
  createdAt!: Date;

  @ApiProperty({ type: Date })
  updatedAt!: Date;
}
