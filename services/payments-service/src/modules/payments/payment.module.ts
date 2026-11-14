import { Module } from '@nestjs/common';
import { PaymentController } from '../../infrastructure/http/controllers/payment.controller.js';
import { ProcessPaymentUseCase } from '../../application/use-cases/process-payment.use-case.js';
import { MongoPaymentRepository } from '../../infrastructure/persistence/repositories/mongodb-payment.repository.js';
import { PAYMENT_REPOSITORY_PORT } from '../../domain/ports/payment.repository.js';

@Module({
  controllers: [PaymentController],
  providers: [
    ProcessPaymentUseCase,
    {
      provide: PAYMENT_REPOSITORY_PORT,
      useClass: MongoPaymentRepository,
    },
  ],
})
export class PaymentModule {}
