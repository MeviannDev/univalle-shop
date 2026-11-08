import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { loadAppConfig } from './config/app-config.js';

async function bootstrap() {
  const config = loadAppConfig();
  const app = await NestFactory.create(
    AppModule,
    config.observe ? { instrument: ObserveInstrument } : {},
  );
  await app.listen(config.port);
}
await bootstrap();
