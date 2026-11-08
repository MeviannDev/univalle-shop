import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { loadAppConfig } from './config/app-config.js';
import { ConfigModule } from './config/config.module.js';
import { HealthModule } from './health/health.module.js';
import { UsersProxyModule } from './proxy/users-proxy.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();
const config = loadAppConfig();

@Module({
  imports: [
    ConfigModule,
    HealthModule,
    UsersProxyModule,
    ...(config.observe
      ? [
          ObserveModule.forRoot({
            ...config.observe,
            serviceId: 'api-gateway',
          }),
        ]
      : []),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
