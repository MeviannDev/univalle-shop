import {
  IsBoolean,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class AddressDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  street!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  department!: string;

  @IsString()
  @MinLength(7)
  @MaxLength(20)
  phone!: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  street?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  department?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  phone?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isDefault?: boolean;
}
