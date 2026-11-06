import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { vi } from 'vitest';
import { DomainExceptionFilter } from '../src/common/filters/domain-exception.filter.js';
import { EMAIL_SENDER } from '../src/modules/auth/domain/ports/email.sender.js';
import { AppModule } from '../src/app.module.js';

describe('Users service authentication (e2e)', () => {
  let app: INestApplication<App>;
  const verificationLinks: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EMAIL_SENDER)
      .useValue({
        sendVerificationEmail: vi.fn(async (_email: string, url: string) => {
          verificationLinks.push(url);
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers, blocks unverified login, verifies email, and issues a JWT for an active user', async () => {
    await request(app.getHttpServer()).get('/').expect(404);

    const registration = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'e2e-user@correounivalle.edu.co',
        firstName: 'E2E',
        lastName: 'User',
        password: 'Univalle2026!',
        vinculationType: 'ESTUDIANTE',
      })
      .expect(201);
    expect(registration.body).toMatchObject({ status: 'PENDING_VERIFICATION' });
    expect(registration.body).not.toHaveProperty('verificationUrl');
    expect(verificationLinks).toHaveLength(1);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'e2e-user@correounivalle.edu.co',
        firstName: 'E2E',
        lastName: 'User',
        password: 'Univalle2026!',
        vinculationType: 'ESTUDIANTE',
      })
      .expect(409);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'e2e-user@correounivalle.edu.co',
        password: 'Univalle2026!',
      })
      .expect(401)
      .expect(({ body }) => expect(body.message).toBe('Invalid credentials'));

    const verificationUrl = new URL(verificationLinks[0]!);
    const token = verificationUrl.searchParams.get('token');
    await request(app.getHttpServer())
      .get(`${verificationUrl.pathname}${verificationUrl.search}`)
      .expect(200, { verified: true });
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token })
      .expect(401, {
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Verification link is invalid or expired',
      });

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'e2e-user@correounivalle.edu.co',
        password: 'Univalle2026!',
      })
      .expect(201);
    expect(login.body.accessToken).toEqual(expect.any(String));
    expect(login.body.user).not.toHaveProperty('passwordHash');

    const profile = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(profile.body).toMatchObject({
      email: 'e2e-user@correounivalle.edu.co',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    });
    await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ firstName: null })
      .expect(400);

    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(403);
  });
});
