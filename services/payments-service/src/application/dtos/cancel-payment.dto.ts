import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelPaymentDto {
  @ApiProperty({ example: 'order_123' })
  @IsString()
  @MinLength(1)
  orderId: string;
}
