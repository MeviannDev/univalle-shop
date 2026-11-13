import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ProductKindDto {
  PRODUCT = 'PRODUCT',
  SERVICE = 'SERVICE',
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** Precio en centavos de COP (entero) */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsEnum(ProductKindDto)
  kind?: ProductKindDto;

  @IsOptional()
  @IsString()
  categoryId?: string;

  /** Solo aplica cuando kind = PRODUCT. Máximo 99 según SDD. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  stock?: number;
}