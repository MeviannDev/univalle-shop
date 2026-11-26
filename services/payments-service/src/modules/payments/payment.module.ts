import { Module } from '@nestjs/common';
import { PaymentController } from '../../infrastructure/http/controllers/payment.controller.js';
import { ProcessPaymentUseCase } from '../../application/use-cases/process-payment.use-case.js';
import { CancelPaymentUseCase } from '../../application/use-cases/cancel-payment.use-case.js';
import { MongoPaymentRepository } from '../../infrastructure/persistence/repositories/mongodb-payment.repository.js';
import { PAYMENT_REPOSITORY_PORT } from '../../domain/ports/payment.repository.js';
import { PaymentCallbackDispatcher } from '../../infrastructure/callbacks/payment-callback-dispatcher.js';
import { InternalApiKeyGuard } from '../../infrastructure/http/internal-api-key.guard.js';

@Module({
  controllers: [PaymentController],
  providers: [
    ProcessPaymentUseCase,
    CancelPaymentUseCase,
    PaymentCallbackDispatcher,
    InternalApiKeyGuard,
    {
      provide: PAYMENT_REPOSITORY_PORT,
      useClass: MongoPaymentRepository,
    },
  ],
})
export class PaymentModule {}
