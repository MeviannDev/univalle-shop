import { once } from 'node:events';
import { createServer, type RequestListener, type Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { ProductUnavailableError } from '../src/application/errors/product-unavailable.error.js';
import { ProductId } from '../src/domain/value-objects/product-id.js';
import { Quantity } from '../src/domain/value-objects/quantity.js';
import { CatalogHttpAdapter } from '../src/infrastructure/clients/catalog-http.adapter.js';
import { HttpServiceClient } from '../src/infrastructure/clients/http-service-client.js';
import { RequestIdContext } from '../src/infrastructure/clients/request-id.context.js';

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map(
        async (server) =>
          new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          ),
      ),
  );
});

describe('CatalogHttpAdapter', () => {
  it('consume el contrato real de producto y protege las operaciones de reserva', async () => {
    const calls: Array<{
      path: string;
      method: string;
      apiKey?: string;
      body?: unknown;
    }> = [];
    const server = await startServer(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      calls.push({
        path: request.url ?? '',
        method: request.method ?? '',
        apiKey: request.headers['x-internal-api-key'],
        body: chunks.length
          ? JSON.parse(Buffer.concat(chunks).toString('utf8'))
          : undefined,
      });

      response.writeHead(
        request.method === 'GET' ? 200 : request.method === 'POST' ? 201 : 200,
        { 'content-type': 'application/json' },
      );
      response.end(
        JSON.stringify(
          request.url === '/products/product-1'
            ? {
                id: 'product-1',
                name: 'Cuaderno',
                price: 12000,
                stock: 5,
                active: true,
              }
            : { reservationId: 'reservation-1', status: 'RESERVED' },
        ),
      );
    });
    const adapter = createAdapter(server);
    const productId = new ProductId('product-1');

    await expect(adapter.getProduct(productId)).resolves.toMatchObject({
      name: 'Cuaderno',
      unitPrice: { amount: 12000, currency: 'COP' },
      available: true,
      stock: 5,
    });
    await expect(
      adapter.reserveStock({
        reservationId: 'reservation-1',
        productId,
        quantity: new Quantity(2),
      }),
    ).resolves.toEqual({ reservationId: 'reservation-1', reserved: true });
    await adapter.commitStock('reservation-1');
    await adapter.releaseStock('reservation-1');

    expect(calls.map(({ method, path }) => `${method} ${path}`)).toEqual([
      'GET /products/product-1',
      'POST /inventory/reservations',
      'POST /inventory/reservations/reservation-1/commit',
      'DELETE /inventory/reservations/reservation-1',
    ]);
    expect(
      calls.slice(1).every((call) => call.apiKey === 'shared-test-key'),
    ).toBe(true);
    expect(calls[1]?.body).toEqual({
      reservationId: 'reservation-1',
      productId: 'product-1',
      quantity: 2,
    });
  });

  it('traduce el 409 de stock insuficiente a producto no disponible', async () => {
    const server = await startServer((_request, response) => {
      response.writeHead(409, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ message: 'Stock insuficiente' }));
    });
    const adapter = createAdapter(server);

    await expect(
      adapter.reserveStock({
        reservationId: 'reservation-2',
        productId: new ProductId('product-1'),
        quantity: new Quantity(1),
      }),
    ).rejects.toBeInstanceOf(ProductUnavailableError);
  });
});

async function startServer(handler: RequestListener): Promise<Server> {
  const server = createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  servers.push(server);
  return server;
}

function createAdapter(server: Server): CatalogHttpAdapter {
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Dirección local de servidor no disponible');
  }
  const config = new ConfigService({
    CATALOG_SERVICE_URL: `http://127.0.0.1:${address.port}`,
    CATALOG_TIMEOUT_MS: '1000',
    INTERNAL_SERVICE_API_KEY: 'shared-test-key',
  });
  const http = new HttpServiceClient(new RequestIdContext(), config);
  return new CatalogHttpAdapter(http);
}
