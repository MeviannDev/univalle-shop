import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

/** Solo transforma los tipos del query string; las reglas reales viven en SearchQuery (dominio). */
export class SearchQueryDto {
  @ApiPropertyOptional({ description: 'Texto a buscar (1-100 caracteres)', example: 'cuaderno' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ['PRODUCT', 'SERVICE'] })
  @IsOptional()
  @IsString()
  kind?: string;

  @ApiPropertyOptional({ example: 'papeleria' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}