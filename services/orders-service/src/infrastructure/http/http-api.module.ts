import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module.js';
import { ServiceAdaptersModule } from '../adapters/service-adapters.module.js';
import { AuthenticationModule } from '../auth/authentication.module.js';
import { AdminOrdersController } from './controllers/admin-orders.controller.js';
import { CartController } from './controllers/cart.controller.js';
import { DevAuthController } from './controllers/dev-auth.controller.js';
import { OrdersController } from './controllers/orders.controller.js';
import { HealthController } from './controllers/health.controller.js';
import { HttpExceptionFilter } from './filters/http-exception.filter.js';

@Module({
  imports: [ApplicationModule, AuthenticationModule, ServiceAdaptersModule],
  controllers: [
    CartController,
    OrdersController,
    AdminOrdersController,
    HealthController,
    DevAuthController,
  ],
  providers: [HttpExceptionFilter],
  exports: [HttpExceptionFilter],
})
export class HttpApiModule {}
