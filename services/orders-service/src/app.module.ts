import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApplicationModule } from './application/application.module.js';
import { RequestIdContext } from './infrastructure/clients/request-id.context.js';
import { DatabaseModule } from './infrastructure/persistence/database.module.js';
import { HttpApiModule } from './infrastructure/http/http-api.module.js';
import { PersistenceModule } from './infrastructure/persistence/persistence.module.js';
import { ServiceAdaptersModule } from './infrastructure/adapters/service-adapters.module.js';
import { validateEnvironment } from './infrastructure/config/environment.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),
    DatabaseModule,
    PersistenceModule,
    ServiceAdaptersModule,
    ApplicationModule,
    HttpApiModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestIdContext)
      .forRoutes({ path: '{*path}', method: RequestMethod.ALL });
  }
}
