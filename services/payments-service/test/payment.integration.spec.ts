import { once } from 'node:events';
import { createServer, type RequestListener, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { CreatePaymentDto } from '../src/application/dtos/create-payment.dto.js';
import { CancelPaymentUseCase } from '../src/application/use-cases/cancel-payment.use-case.js';
import { ProcessPaymentUseCase } from '../src/application/use-cases/process-payment.use-case.js';
import { Payment } from '../src/domain/entities/payment.entity.js';
import {
  PaymentIdempotencyConflictError,
  PaymentNotFoundError,
} from '../src/domain/errors/payment-errors.js';
import { PAYMENT_STATUS } from '../src/domain/value-objects/payment-status.js';
import { PaymentCallbackDispatcher } from '../src/infrastructure/callbacks/payment-callback-dispatcher.js';
import { MongoPaymentRepository } from '../src/infrastructure/persistence/repositories/mongodb-payment.repository.js';

const servers: Server[] = [];

describe('Payments idempotency and callback outbox', () => {
  let mongo: MongoMemoryServer;
  let repository: MongoPaymentRepository;
  const previousEnvironment = new Map<string, string | undefined>();
  const environmentKeys = [
    'MONGODB_URI',
    'MONGODB_DATABASE',
    'PAYMENT_CALLBACK_ENABLED',
    'PAYMENT_SIMULATION_RESULT',
    'ORDERS_CALLBACK_BASE_URL',
    'INTERNAL_SERVICE_API_KEY',
    'PAYMENT_CALLBACK_POLL_INTERVAL_MS',
    'PAYMENT_CALLBACK_TIMEOUT_MS',
    'PAYMENT_CALLBACK_MAX_ATTEMPTS',
  ];

  beforeAll(async () => {
    for (const key of environmentKeys) {
      previousEnvironment.set(key, process.env[key]);
    }
    mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri();
    process.env.MONGODB_DATABASE = 'payments_test';
    process.env.PAYMENT_CALLBACK_ENABLED = 'true';
    process.env.PAYMENT_SIMULATION_RESULT = 'approved';
    process.env.INTERNAL_SERVICE_API_KEY =
      'test-internal-key-that-is-at-least-32-bytes';
    process.env.PAYMENT_CALLBACK_POLL_INTERVAL_MS = '50';
    process.env.PAYMENT_CALLBACK_TIMEOUT_MS = '1000';
    process.env.PAYMENT_CALLBACK_MAX_ATTEMPTS = '3';
    repository = new MongoPaymentRepository();
    await repository.onModuleInit();
  }, 120_000);

  afterAll(async () => {
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
    await repository?.onModuleDestroy();
    await mongo?.stop();
    for (const key of environmentKeys) {
      const value = previousEnvironment.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('creates only one payment for concurrent requests with the same key', async () => {
    const processPayment = new ProcessPaymentUseCase(repository);
    const dto = createDto();
    const [first, second] = await Promise.all([
      processPayment.execute(dto, 'checkout-key'),
      processPayment.execute(dto, 'checkout-key'),
    ]);

    expect(first.id).toBe(second.id);
    expect(first.status).toBe(PAYMENT_STATUS.APPROVED);
    expect(first.callbackEventId).toBeTruthy();
    expect(
      await repository.findByIdempotencyKey(dto.userId, 'checkout-key'),
    ).toMatchObject({ id: first.id });
    if (first.callbackEventId) {
      await repository.markCallbackDelivered(first.id, first.callbackEventId);
    }
    await expect(
      processPayment.execute({ ...dto, amount: 800 }, 'checkout-key'),
    ).rejects.toBeInstanceOf(PaymentIdempotencyConflictError);
  });

  it('retries an undelivered callback with the same event id and API key', async () => {
    const payment = await new ProcessPaymentUseCase(repository).execute(
      createDto({ orderId: 'order-callback' }),
      'callback-key',
    );
    let responseStatus = 503;
    const received: Array<{
      path: string;
      key: string | undefined;
      body: Record<string, unknown>;
    }> = [];
    const server = await startServer(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      received.push({
        path: request.url ?? '',
        key: request.headers['x-internal-api-key'] as string | undefined,
        body: JSON.parse(Buffer.concat(chunks).toString('utf8')),
      });
      response.writeHead(responseStatus).end();
    });
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Dirección local de servidor no disponible');
    }
    process.env.ORDERS_CALLBACK_BASE_URL = `http://127.0.0.1:${address.port}/api/orders`;
    const dispatcher = new PaymentCallbackDispatcher(repository);

    await dispatcher.dispatchPendingCallbacks();
    responseStatus = 200;
    await dispatcher.dispatchPendingCallbacks();

    expect(received).toHaveLength(2);
    expect(received[0]).toMatchObject({
      path: `/api/orders/${payment.orderId}/payment-result`,
      key: process.env.INTERNAL_SERVICE_API_KEY,
      body: {
        paymentId: payment.id,
        result: 'APPROVED',
        eventId: payment.callbackEventId,
      },
    });
    expect(received[1]?.body.eventId).toBe(received[0]?.body.eventId);
    expect(await repository.findUndeliveredCallbacks(3, 10)).toHaveLength(0);
    expect(await repository.findById(payment.id)).toMatchObject({
      callbackAttempts: 2,
      callbackDeliveredAt: expect.any(Date),
    });
  });

  it('does not consume callback attempts when its destination is misconfigured', async () => {
    const payment = await new ProcessPaymentUseCase(repository).execute(
      createDto({ orderId: 'order-callback-config' }),
      'callback-config-key',
    );
    delete process.env.ORDERS_CALLBACK_BASE_URL;

    await new PaymentCallbackDispatcher(repository).dispatchPendingCallbacks();

    expect(await repository.findById(payment.id)).toMatchObject({
      callbackAttempts: 0,
    });
  });

  it('rejects invalid callback-enabled configuration', async () => {
    process.env.PAYMENT_CALLBACK_ENABLED = 'yes';

    await expect(
      new PaymentCallbackDispatcher(repository).dispatchPendingCallbacks(),
    ).rejects.toThrow('PAYMENT_CALLBACK_ENABLED debe ser true o false.');

    process.env.PAYMENT_CALLBACK_ENABLED = 'true';
  });

  it('cancels pending payments, refunds approved ones, and rejects another key', async () => {
    const processPayment = new ProcessPaymentUseCase(repository);
    const cancelPayment = new CancelPaymentUseCase(repository);
    const approved = await processPayment.execute(
      createDto({ orderId: 'order-refund' }),
      'refund-payment-key',
    );
    const refunded = await cancelPayment.execute(
      approved.id,
      approved.orderId,
      'refund-key',
    );
    expect(refunded.status).toBe(PAYMENT_STATUS.REFUNDED);
    expect(
      (await repository.findUndeliveredCallbacks(3, 10)).some(
        (payment) => payment.id === approved.id,
      ),
    ).toBe(true);
    await expect(
      cancelPayment.execute(approved.id, approved.orderId, 'other-refund-key'),
    ).rejects.toBeInstanceOf(PaymentIdempotencyConflictError);
    await expect(
      cancelPayment.execute('missing-payment', 'order-refund', 'missing-key'),
    ).rejects.toBeInstanceOf(PaymentNotFoundError);

    const pending = new Payment({
      id: 'payment-pending-cancel',
      orderId: 'order-pending-cancel',
      userId: 'user-1',
      amount: 500,
      currency: 'COP',
      method: 'cash',
      status: PAYMENT_STATUS.PENDING,
    });
    await repository.save(pending);
    const cancelled = await cancelPayment.execute(
      pending.id,
      pending.orderId,
      'cancel-pending-key',
    );
    expect(cancelled.status).toBe(PAYMENT_STATUS.CANCELLED);
  });
});

function createDto(
  overrides: Partial<CreatePaymentDto> = {},
): CreatePaymentDto {
  return {
    orderId: 'order-1',
    userId: 'user-1',
    amount: 700,
    currency: 'COP',
    method: 'card',
    ...overrides,
  };
}

async function startServer(handler: RequestListener): Promise<Server> {
  const server = createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  servers.push(server);
  return server;
}
