import { once } from 'node:events';
import { createServer, type RequestListener, type Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { ExternalServiceUnavailableError } from '../src/application/errors/external-service-unavailable.error.js';
import { InvalidUserTokenError } from '../src/domain/errors/invalid-user-token.error.js';
import { JwtTokenVerifier } from '../src/infrastructure/auth/jwt-token-verifier.js';
import { HttpServiceClient } from '../src/infrastructure/clients/http-service-client.js';
import { RequestIdContext } from '../src/infrastructure/clients/request-id.context.js';
import { UsersHttpAdapter } from '../src/infrastructure/clients/users-http.adapter.js';

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      async (server) =>
        new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        ),
    ),
  );
});

describe('UsersHttpAdapter', () => {
  it('valida con /users/me y toma el rol actual y estado del perfil', async () => {
    let requestPath = '';
    let authorization = '';
    const server = await startServer((request, response) => {
      requestPath = request.url ?? '';
      authorization = request.headers.authorization ?? '';
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({
        id: 'user-current',
        role: 'ADMIN',
        status: 'ACTIVE',
      }));
    });
    const { adapter, verifier } = createAdapter(server);
    const token = verifier.signDevelopmentToken('user-current', 'CUSTOMER');

    const user = await adapter.validateToken(token);

    expect(requestPath).toBe('/users/me');
    expect(authorization).toBe(`Bearer ${token}`);
    expect(user.userId.value).toBe('user-current');
    expect(user.role).toBe('ADMIN');
    expect(user.active).toBe(true);
  });

  it('marca perfiles suspendidos o pendientes como inactivos', async () => {
    const server = await startServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({
        id: 'user-current',
        role: 'CUSTOMER',
        status: 'SUSPENDED',
      }));
    });
    const { adapter, verifier } = createAdapter(server);

    await expect(
      adapter.validateToken(verifier.signDevelopmentToken('user-current', 'CUSTOMER')),
    ).resolves.toMatchObject({ active: false });
  });

  it.each([401, 404])('trata HTTP %i como token de usuario no válido', async (status) => {
    const server = await startServer((_request, response) => {
      response.writeHead(status).end();
    });
    const { adapter, verifier } = createAdapter(server);

    await expect(
      adapter.validateToken(verifier.signDevelopmentToken('user-current', 'CUSTOMER')),
    ).rejects.toBeInstanceOf(InvalidUserTokenError);
  });

  it('traduce indisponibilidad de Users a error de dependencia', async () => {
    const server = await startServer((_request, response) => {
      response.writeHead(503).end();
    });
    const { adapter, verifier } = createAdapter(server);

    await expect(
      adapter.validateToken(verifier.signDevelopmentToken('user-current', 'CUSTOMER')),
    ).rejects.toBeInstanceOf(ExternalServiceUnavailableError);
  });

  it('rechaza JWT inválido sin llamar a Users', async () => {
    let calls = 0;
    const server = await startServer((_request, response) => {
      calls += 1;
      response.writeHead(200).end('{}');
    });
    const { adapter } = createAdapter(server);

    await expect(adapter.validateToken('not-a-jwt')).rejects.toBeInstanceOf(
      InvalidUserTokenError,
    );
    expect(calls).toBe(0);
  });
});

async function startServer(
  handler: RequestListener,
): Promise<Server> {
  const server = createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  servers.push(server);
  return server;
}

function createAdapter(server: Server) {
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Dirección local de servidor no disponible');
  }
  const secret = 'a-test-secret-that-is-at-least-32-bytes';
  const config = new ConfigService({
    NODE_ENV: 'test',
    JWT_SECRET: secret,
    USERS_SERVICE_URL: `http://127.0.0.1:${address.port}`,
    USERS_TIMEOUT_MS: '1000',
    CATALOG_SERVICE_URL: 'http://127.0.0.1:1',
    CATALOG_TIMEOUT_MS: '1000',
    PAYMENTS_SERVICE_URL: 'http://127.0.0.1:1',
    PAYMENTS_TIMEOUT_MS: '1000',
  });
  const verifier = new JwtTokenVerifier(config);
  const http = new HttpServiceClient(
    new RequestIdContext(),
    config,
  );
  return { adapter: new UsersHttpAdapter(http, verifier), verifier };
}
