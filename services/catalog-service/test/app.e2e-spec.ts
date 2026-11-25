import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('documents prefilled examples for product create and update requests', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Univalle Shop').setVersion('1.0').build(),
    );

    expect(document.paths['/products']?.post?.requestBody).toMatchObject({
      content: {
        'application/json': {
          examples: {
            cuaderno: {
              value: {
                name: 'Cuaderno universitario',
                price: 12000,
                stock: 25,
              },
            },
          },
        },
      },
    });
    expect(document.paths['/products/{id}']?.patch?.requestBody).toMatchObject({
      content: {
        'application/json': {
          examples: {
            actualizarPrecioEInventario: {
              value: { price: 13500, stock: 20 },
            },
          },
        },
      },
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
