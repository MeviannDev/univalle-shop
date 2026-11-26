import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const gatewayUrl = new URL(process.env.GATEWAY_URL ?? 'http://localhost:3000');
const catalogUrl = new URL(process.env.CATALOG_URL ?? 'http://localhost:3006');
const mailpitUrl = new URL(process.env.MAILPIT_URL ?? 'http://localhost:8025');
const composeFile = fileURLToPath(
  new URL('../../services/compose.yaml', import.meta.url),
);
const email = `orders-e2e-${randomUUID()}@correounivalle.edu.co`;
const password = 'Valle2026!';
const quantity = 2;
const initialStock = 5;

let productId;
let userId;
let orderId;
let accessToken;
let cancelled = false;
let failure;

try {
  const product = await requestJson(new URL('/products', catalogUrl), {
    method: 'POST',
    body: {
      name: `E2E ${randomUUID()}`,
      description: 'Disposable Compose E2E product',
      price: 100,
      category: 'E2E',
      images: [],
      stock: initialStock,
      active: true,
    },
  });
  productId = product.id;

  const registration = await requestJson(new URL('/auth/register', gatewayUrl), {
    method: 'POST',
    body: {
      email,
      firstName: 'Compose',
      lastName: 'E2E',
      password,
      vinculationType: 'ESTUDIANTE',
      marketingConsent: false,
    },
  });
  userId = registration.id;
  assert.equal(registration.status, 'PENDING_VERIFICATION');

  const verificationToken = await waitForVerificationToken(email);
  await requestJson(new URL('/auth/verify-email', gatewayUrl), {
    method: 'POST',
    body: { token: verificationToken },
  });

  const login = await requestJson(new URL('/auth/login', gatewayUrl), {
    method: 'POST',
    body: { email, password },
  });
  accessToken = login.accessToken;
  assert.ok(accessToken);

  const authHeaders = { authorization: `Bearer ${accessToken}` };
  await requestJson(new URL('/cart/items', gatewayUrl), {
    method: 'POST',
    headers: authHeaders,
    body: { productId, quantity },
  });

  const idempotencyKey = randomUUID();
  const checkout = await requestJson(new URL('/orders', gatewayUrl), {
    method: 'POST',
    headers: { ...authHeaders, 'idempotency-key': idempotencyKey },
    body: {},
  });
  orderId = checkout.id;
  assert.ok(orderId);

  let confirmedOrder = checkout;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (confirmedOrder.status === 'PAID') break;
    await delay(500);
    confirmedOrder = await requestJson(
      new URL(`/orders/${encodeURIComponent(orderId)}`, gatewayUrl),
      { headers: authHeaders },
    );
  }
  assert.equal(confirmedOrder.status, 'PAID');

  const productAfterCheckout = await requestJson(
    new URL(`/products/${encodeURIComponent(productId)}`, catalogUrl),
  );
  assert.equal(productAfterCheckout.stock, initialStock - quantity);

  const cancelledOrder = await requestJson(
    new URL(`/orders/${encodeURIComponent(orderId)}/cancel`, gatewayUrl),
    { method: 'POST', headers: authHeaders, body: {} },
  );
  cancelled = cancelledOrder.status === 'CANCELLED';
  assert.equal(cancelled, true);

  const productAfterCancel = await requestJson(
    new URL(`/products/${encodeURIComponent(productId)}`, catalogUrl),
  );
  assert.equal(productAfterCancel.stock, initialStock);

  console.log(
    'Compose E2E passed: registration, verification, login, cart, checkout, payment approval, stock commit, and stock restoration.',
  );
} catch (error) {
  failure = error;
} finally {
  try {
    await cleanup();
  } catch (error) {
    console.error('Compose E2E cleanup failed:', error);
    failure ??= error;
  }
}

if (failure) {
  console.error('Compose E2E failed:', failure);
  process.exitCode = 1;
}

async function requestJson(url, { method = 'GET', headers = {}, body } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(10_000),
  });
  const text = await response.text();
  const result = text ? JSON.parse(text) : undefined;
  assert.ok(
    response.ok,
    `${method} ${url} returned ${response.status}: ${text}`,
  );
  return result;
}

async function waitForVerificationToken(recipient) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const inbox = await requestJson(new URL('/api/v1/messages', mailpitUrl));
    const message = inbox.messages.find((item) =>
      item.To.some((address) => address.Address === recipient),
    );
    if (message) {
      const content = await requestJson(
        new URL(`/api/v1/message/${encodeURIComponent(message.ID)}`, mailpitUrl),
      );
      const match = content.Text.match(/token=([A-Za-z0-9._-]+)/);
      if (match) return match[1];
    }
    await delay(250);
  }
  throw new Error('Verification email was not received from Mailpit');
}

async function cleanup() {
  const cleanupErrors = [];
  if (orderId && accessToken && !cancelled) {
    try {
      const response = await fetch(
        new URL(`/orders/${encodeURIComponent(orderId)}/cancel`, gatewayUrl),
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json',
          },
          body: '{}',
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!response.ok && response.status !== 409) {
        throw new Error(`Could not cancel test order: HTTP ${response.status}`);
      }
    } catch (error) {
      cleanupErrors.push(error);
    }
  }

  if (productId) {
    try {
      const response = await fetch(
        new URL(`/products/${encodeURIComponent(productId)}`, catalogUrl),
        { method: 'DELETE', signal: AbortSignal.timeout(10_000) },
      );
      if (!response.ok && response.status !== 404) {
        throw new Error(`Could not delete test product: HTTP ${response.status}`);
      }
    } catch (error) {
      cleanupErrors.push(error);
    }
  }

  try {
    const removeUser = userId
      ? `db.users.deleteOne({ id: ${JSON.stringify(userId)} });`
      : `db.users.deleteOne({ email: ${JSON.stringify(email)} });`;
    execFileSync(
      'docker',
      [
        'compose',
        '-f',
        composeFile,
        'exec',
        '-T',
        'mongodb-users',
        'mongosh',
        'univalle_users',
        '--quiet',
        '--eval',
        removeUser,
      ],
      { stdio: 'ignore' },
    );
    if (productId) {
      execFileSync(
        'docker',
        [
          'compose',
          '-f',
          composeFile,
          'exec',
          '-T',
          'mongodb-catalog',
          'mongosh',
          'univalle_catalog',
          '--quiet',
          '--eval',
          `db.inventory_reservations.deleteMany({ productId: ${JSON.stringify(productId)} });`,
        ],
        { stdio: 'ignore' },
      );
    }
    if (orderId) {
      execFileSync(
        'docker',
        [
          'compose',
          '-f',
          composeFile,
          'exec',
          '-T',
          'mongodb-orders',
          'mongosh',
          'univalle_orders',
          '--quiet',
          '--eval',
          `db.orders.deleteOne({ _id: ${JSON.stringify(orderId)} }); db.payment_events.deleteMany({ orderId: ${JSON.stringify(orderId)} }); db.carts.deleteMany({ userId: ${JSON.stringify(userId)} });`,
        ],
        { stdio: 'ignore' },
      );
      execFileSync(
        'docker',
        [
          'compose',
          '-f',
          composeFile,
          'exec',
          '-T',
          'mongodb-payments',
          'mongosh',
          'univalle_payments',
          '--quiet',
          '--eval',
          `db.payments.deleteMany({ orderId: ${JSON.stringify(orderId)} });`,
        ],
        { stdio: 'ignore' },
      );
    }
  } catch (error) {
    cleanupErrors.push(error);
  }

  if (cleanupErrors.length) {
    throw new AggregateError(cleanupErrors, 'Failed to remove E2E records');
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
