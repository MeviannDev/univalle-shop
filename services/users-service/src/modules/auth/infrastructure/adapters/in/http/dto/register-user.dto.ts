import {
  IsEmail,
  IsEnum,
  IsString,
  IsBoolean,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterUserDto {
  @ApiProperty({
    description: 'Correo institucional de la cuenta.',
    example: 'ana.valencia@correounivalle.edu.co',
    maxLength: 254,
  })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({
    description: 'Nombres del usuario.',
    example: 'Ana',
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({
    description: 'Apellidos del usuario.',
    example: 'Valencia',
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @ApiPropertyOptional({
    description:
      'Teléfono principal de contacto. Puede omitirse y agregarse después en el perfil.',
    example: '+57 300 1234567',
    minLength: 7,
    maxLength: 20,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Matches(/^(?=.*\d)[+()\d\s-]{7,20}$/)
  primaryPhone?: string;

  @ApiPropertyOptional({
    description:
      'Consentimiento para recibir comunicaciones de marketing. Si se omite, se considera no otorgado.',
    example: false,
    default: false,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  marketingConsent?: boolean;

  @ApiProperty({
    description: 'Contraseña de al menos 8 caracteres.',
    example: 'Valle2026!',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({
    description: 'Tipo de vinculación con la institución.',
    enum: ['ESTUDIANTE', 'DOCENTE', 'ADMINISTRATIVO'],
    example: 'ESTUDIANTE',
  })
  @IsEnum(['ESTUDIANTE', 'DOCENTE', 'ADMINISTRATIVO'])
  vinculationType!: 'ESTUDIANTE' | 'DOCENTE' | 'ADMINISTRATIVO';
}
