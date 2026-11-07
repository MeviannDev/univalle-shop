import { Module } from '@nestjs/common';
import { PaymentModule } from './modules/payments/payment.module.js';

@Module({
  imports: [PaymentModule],
})
export class AppModule {}
