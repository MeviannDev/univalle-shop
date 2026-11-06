import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { rateLimit } from 'express-rate-limit';
import { AppModule } from './app.module.js';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(
    '/auth/login',
    rateLimit({
      windowMs: 60_000,
      limit: 5,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new DomainExceptionFilter());
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Users Service API')
    .setDescription('API REST de usuarios, autenticación y direcciones')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3002);
}
await bootstrap();
