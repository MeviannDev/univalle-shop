import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/persistence/database.module.js';
import { HealthController } from './infrastructure/http/controllers/health.controller.js';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    DatabaseModule,
  ],
})
export class AppModule {}
