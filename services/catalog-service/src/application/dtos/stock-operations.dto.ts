import { IsString, IsNotEmpty, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para operaciones de stock:
 * - checkAvailability
 * - reserveStock
 * - releaseStock
 * - commitStock
 */
export class StockOperationDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99) // según SDD: máximo por ítem = 99
  quantity!: number;
}

export class CheckAvailabilityDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;
}