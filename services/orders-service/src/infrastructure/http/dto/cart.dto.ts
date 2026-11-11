import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, Matches, Max, Min, MinLength } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({ example: 'demo-notebook' })
  @IsString()
  @MinLength(1)
  productId!: string;

  @ApiProperty({ example: 2, minimum: 1, maximum: 99 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;
}

export class ChangeCartItemQuantityDto {
  @ApiProperty({ example: 3, minimum: 1, maximum: 99 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;
}

export class ProductIdParamDto {
  @ApiProperty({ example: 'demo-notebook' })
  @IsString()
  @MinLength(1)
  @Matches(/^[A-Za-z0-9_-]+$/)
  productId!: string;
}
