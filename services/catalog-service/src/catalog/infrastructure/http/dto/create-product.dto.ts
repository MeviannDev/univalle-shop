import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Cuaderno', minLength: 1 })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'Cuaderno universitario de 100 hojas' })
  @IsString()
  description!: string;

  @ApiProperty({ example: 12000, minimum: 0 })
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  price!: number;

  @ApiProperty({ example: 'Papelería', minLength: 1 })
  @IsString()
  @MinLength(1)
  category!: string;

  @ApiProperty({
    type: [String],
    example: ['https://example.com/cuaderno.jpg'],
  })
  @IsArray()
  @IsString({ each: true })
  images!: string[];

  @ApiProperty({ example: 25, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock!: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Cuaderno', minLength: 1 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ example: 'Cuaderno universitario de 100 hojas' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 12000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 'Papelería', minLength: 1 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  category?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['https://example.com/cuaderno.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ example: 25, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
