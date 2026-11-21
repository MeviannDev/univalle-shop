import {
  IsEnum,
  IsBoolean,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'Nombres del usuario.',
    example: 'Ana María',
    maxLength: 100,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Apellidos del usuario.',
    example: 'Valencia',
    maxLength: 100,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({
    description:
      'Teléfono principal de contacto. Envía null para eliminarlo del perfil.',
    example: '+57 300 1234567',
    minLength: 7,
    maxLength: 20,
    nullable: true,
  })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @Matches(/^(?=.*\d)[+()\d\s-]{7,20}$/)
  primaryPhone?: string | null;

  @ApiPropertyOptional({
    description:
      'Consentimiento para comunicaciones de marketing. Enviar false lo revoca.',
    example: true,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  marketingConsent?: boolean;

  @ApiPropertyOptional({
    description: 'Tipo de vinculación con la institución.',
    enum: ['ESTUDIANTE', 'DOCENTE', 'ADMINISTRATIVO'],
    example: 'ESTUDIANTE',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(['ESTUDIANTE', 'DOCENTE', 'ADMINISTRATIVO'])
  vinculationType?: 'ESTUDIANTE' | 'DOCENTE' | 'ADMINISTRATIVO';
}
