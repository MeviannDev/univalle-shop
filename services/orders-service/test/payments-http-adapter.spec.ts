import { once } from 'node:events';
import { createServer, type RequestListener, type Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { Money } from '../src/domain/value-objects/money.js';
import { OrderId } from '../src/domain/value-objects/order-id.js';
import { UserId } from '../src/domain/value-objects/user-id.js';
import { HttpServiceClient } from '../src/infrastructure/clients/http-service-client.js';
import { PaymentsHttpAdapter } from '../src/infrastructure/clients/payments-http.adapter.js';
import { RequestIdContext } from '../src/infrastructure/clients/request-id.context.js';
import { ExternalServiceUnavailableError } from '../src/application/errors/external-service-unavailable.error.js';

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

describe('PaymentsHttpAdapter', () => {
  it('uses the real simulation API shape and translates lowercase statuses', async () => {
    const calls: Array<{
      path: string;
      method: string;
      apiKey?: string | string[];
      idempotencyKey?: string | string[];
      body?: unknown;
    }> = [];
    const server = await startServer(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      calls.push({
        path: request.url ?? '',
        method: request.method ?? '',
        apiKey: request.headers['x-internal-api-key'],
        idempotencyKey: request.headers['idempotency-key'],
        body: chunks.length
          ? JSON.parse(Buffer.concat(chunks).toString('utf8'))
          : undefined,
      });
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify(
          request.url === '/payments/simulate'
            ? {
                id: 'payment-1',
                status: 'approved',
                callbackEventId: 'payment-event-1',
              }
            : { id: 'payment-1', status: 'refunded' },
        ),
      );
    });
    const adapter = createAdapter(server);

    await expect(
      adapter.startPayment({
        orderId: new OrderId('order-1'),
        userId: new UserId('user-1'),
        amount: new Money(125000, 'COP'),
        idempotencyKey: 'checkout-key',
      }),
    ).resolves.toEqual({
      paymentId: 'payment-1',
      status: 'APPROVED',
      eventId: 'payment-event-1',
    });
    await adapter.cancelOrRefundPayment({
      paymentId: 'payment-1',
      orderId: new OrderId('order-1'),
      idempotencyKey: 'cancel-key',
    });

    expect(calls.map(({ method, path }) => `${method} ${path}`)).toEqual([
      'POST /payments/simulate',
      'POST /payments/payment-1/cancel',
    ]);
    expect(calls[0]).toMatchObject({
      apiKey: 'shared-test-key',
      idempotencyKey: 'checkout-key',
      body: {
        orderId: 'order-1',
        userId: 'user-1',
        amount: 125000,
        currency: 'COP',
        method: 'card',
      },
    });
    expect(calls[1]).toMatchObject({
      apiKey: 'shared-test-key',
      idempotencyKey: 'cancel-key',
      body: { orderId: 'order-1' },
    });
  });

  it('times out and retries an idempotent request only once', async () => {
    let requests = 0;
    const server = await startServer((_request, response) => {
      requests += 1;
      setTimeout(() => {
        if (!response.destroyed) {
          response.writeHead(200, { 'content-type': 'application/json' });
          response.end(JSON.stringify({ id: 'payment-1', status: 'pending' }));
        }
      }, 500);
    });
    const adapter = createAdapter(server, 100);

    await expect(
      adapter.startPayment({
        orderId: new OrderId('order-timeout'),
        userId: new UserId('user-1'),
        amount: new Money(125000, 'COP'),
        idempotencyKey: 'checkout-timeout',
      }),
    ).rejects.toBeInstanceOf(ExternalServiceUnavailableError);
    expect(requests).toBe(2);
  });
});

async function startServer(handler: RequestListener): Promise<Server> {
  const server = createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  servers.push(server);
  return server;
}

function createAdapter(server: Server, timeoutMs = 1000): PaymentsHttpAdapter {
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Dirección local de servidor no disponible');
  }
  const config = new ConfigService({
    PAYMENTS_SERVICE_URL: `http://127.0.0.1:${address.port}`,
    PAYMENTS_TIMEOUT_MS: String(timeoutMs),
    INTERNAL_SERVICE_API_KEY: 'shared-test-key',
  });
  return new PaymentsHttpAdapter(
    new HttpServiceClient(new RequestIdContext(), config),
  );
}
