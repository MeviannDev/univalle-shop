import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule, ObserveInstrument } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Univalle Shop - API de búsqueda')
    .setDescription(
      'Búsqueda de productos e indexación interna desde el Servicio de Catálogo.',
    )
    .setVersion('1.0.0')
    .addTag('Búsqueda')
    .addTag('Indexación interna')
    .build();
  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, documentFactory, {
    jsonDocumentUrl: 'api/docs-json',
  });

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
