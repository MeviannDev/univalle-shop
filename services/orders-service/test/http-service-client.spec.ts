import { once } from 'node:events';
import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { ExternalServiceUnavailableError } from '../src/application/errors/external-service-unavailable.error.js';
import { adaptCall } from '../src/infrastructure/clients/external-error.mapper.js';
import { HttpServiceClient } from '../src/infrastructure/clients/http-service-client.js';
import { RequestIdContext } from '../src/infrastructure/clients/request-id.context.js';

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      async (server) =>
        new Promise<void>((resolve, reject) =>
          server.close((error) => error ? reject(error) : resolve()),
        ),
    ),
  );
});

describe('HttpServiceClient', () => {
  it('reintenta GET idempotente ante 5xx y propaga X-Request-Id', async () => {
    let calls = 0;
    let requestId = '';
    const server = createServer((request, response) => {
      calls += 1;
      requestId = request.headers['x-request-id'] as string;
      if (calls === 1) {
        response.writeHead(503).end();
        return;
      }
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ok: true }));
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    servers.push(server);
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Dirección local de servidor no disponible');
    }

    const client = clientFor(`http://127.0.0.1:${address.port}`);
    const result = await client.request<{ ok: boolean }>('catalog', '/check', {
      idempotent: true,
    });
    expect(result.ok).toBe(true);
    expect(calls).toBe(2);
    expect(requestId).toBe('test-request-id');
  });

  it('no reintenta POST no idempotente después de 5xx', async () => {
    let calls = 0;
    const server = createServer((_request, response) => {
      calls += 1;
      response.writeHead(503).end();
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    servers.push(server);
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Dirección local de servidor no disponible');
    }
    const client = clientFor(`http://127.0.0.1:${address.port}`);

    await expect(client.request('payments', '/charge', { method: 'POST' })).rejects.toThrow('HTTP 503');
    expect(calls).toBe(1);
  });

  it('aplica timeout y traduce indisponibilidad en error tipado', async () => {
    const server = createServer((_request, response) => {
      setTimeout(() => response.writeHead(200).end('{}'), 100);
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    servers.push(server);
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Dirección local de servidor no disponible');
    }
    const client = clientFor(`http://127.0.0.1:${address.port}`, 10);

    await expect(
      adaptCall('Catálogo', () =>
        client.request('catalog', '/slow', { idempotent: true }),
      ),
    ).rejects.toBeInstanceOf(ExternalServiceUnavailableError);
  });
});

function clientFor(url: string, timeout = 1000): HttpServiceClient {
  const config = new ConfigService({
    CATALOG_SERVICE_URL: url,
    CATALOG_TIMEOUT_MS: String(timeout),
    PAYMENTS_SERVICE_URL: url,
    PAYMENTS_TIMEOUT_MS: String(timeout),
    USERS_SERVICE_URL: url,
    USERS_TIMEOUT_MS: String(timeout),
  });
  return new HttpServiceClient(
    { current: () => 'test-request-id' } as RequestIdContext,
    config,
  );
}
