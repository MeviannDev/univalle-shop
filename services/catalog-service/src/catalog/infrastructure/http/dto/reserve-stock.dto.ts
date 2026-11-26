import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsMongoId,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class ReserveStockDto {
  @ApiProperty({ example: 'reservation_2a6f6a82-913e-47da-9a9d-b59e83f51a80' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  reservationId!: string;

  @ApiProperty({ example: '665a1c42e249b316a38f0201' })
  @IsMongoId()
  productId!: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}
