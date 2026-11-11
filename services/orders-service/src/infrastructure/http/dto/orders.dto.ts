import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { ORDER_STATUSES, type OrderStatusValue } from '../../../domain/value-objects/order-status.js';

export class CheckoutDto {
  @ApiPropertyOptional({ example: 'CARD' })
  @IsOptional()
  @IsString()
  @IsIn(['CARD', 'TRANSFER', 'CASH'])
  paymentMethod?: string;
}

export class OrderIdParamDto {
  @ApiProperty({ example: 'order_550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @MinLength(1)
  id!: string;
}

export class OrderListQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ enum: ORDER_STATUSES })
  @IsOptional()
  @IsIn(ORDER_STATUSES)
  status?: OrderStatusValue;
}

export class AdminOrderListQueryDto extends OrderListQueryDto {
  @ApiPropertyOptional({ example: 'user_123' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  userId?: string;
}

export class CancelOrderDto {
  @ApiPropertyOptional({ example: 'El usuario cambió de opinión' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  reason?: string;
}

export class PaymentResultDto {
  @ApiProperty({ example: 'payment_123' })
  @IsString()
  @MinLength(1)
  paymentId!: string;

  @ApiProperty({ enum: ['APPROVED', 'REJECTED', 'PENDING'], example: 'APPROVED' })
  @IsIn(['APPROVED', 'REJECTED', 'PENDING'])
  result!: 'APPROVED' | 'REJECTED' | 'PENDING';

  @ApiProperty({ example: 'payment-event-123' })
  @IsString()
  @MinLength(1)
  eventId!: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ORDER_STATUSES, example: 'PROCESSING' })
  @IsIn(ORDER_STATUSES)
  status!: OrderStatusValue;
}

export class IdempotencyKeyHeaderDto {
  @ApiProperty({ example: 'checkout-2026-0001' })
  @IsString()
  @MinLength(1)
  @Max(128)
  key!: string;
}
