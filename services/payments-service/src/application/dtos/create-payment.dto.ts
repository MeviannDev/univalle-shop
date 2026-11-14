import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PAYMENT_STATUS, type PaymentStatus } from '../../domain/value-objects/payment-status.js';

export class CreatePaymentDto {
  @IsString()
  orderId: string;

  @IsString()
  userId: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  currency: string;

  @IsString()
  method: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PAYMENT_STATUS)
  status?: PaymentStatus;
}
