import {
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateProfileDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(['ESTUDIANTE', 'DOCENTE', 'ADMINISTRATIVO'])
  vinculationType?: 'ESTUDIANTE' | 'DOCENTE' | 'ADMINISTRATIVO';
}
