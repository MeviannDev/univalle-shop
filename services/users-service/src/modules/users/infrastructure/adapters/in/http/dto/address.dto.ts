import {
  IsBoolean,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddressDto {
  @ApiProperty({
    description: 'Calle, carrera u otra dirección física.',
    example: 'Calle 13 # 100-00',
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  street!: string;

  @ApiProperty({ description: 'Ciudad.', example: 'Cali', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city!: string;

  @ApiProperty({
    description: 'Departamento o región.',
    example: 'Valle del Cauca',
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  department!: string;

  @ApiProperty({
    description: 'Teléfono de contacto (entre 7 y 20 caracteres).',
    example: '+57 300 1234567',
    minLength: 7,
    maxLength: 20,
  })
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  phone!: string;

  @ApiPropertyOptional({
    description: 'Indica si esta será la dirección predeterminada.',
    example: true,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @ApiPropertyOptional({
    description: 'Calle, carrera u otra dirección física.',
    example: 'Calle 14 # 100-00',
    maxLength: 200,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  street?: string;

  @ApiPropertyOptional({
    description: 'Ciudad.',
    example: 'Cali',
    maxLength: 100,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    description: 'Departamento o región.',
    example: 'Valle del Cauca',
    maxLength: 100,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({
    description: 'Teléfono de contacto (entre 7 y 20 caracteres).',
    example: '+57 300 1234567',
    minLength: 7,
    maxLength: 20,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Indica si esta será la dirección predeterminada.',
    example: true,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isDefault?: boolean;
}
