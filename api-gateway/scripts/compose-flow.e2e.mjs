import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
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
const extraProductIds = [];
const testUserIds = [];
const allEmails = [email];

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
  assert.ok(userId);
  testUserIds.push(userId);
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

  const missingProductId = randomBytes(12).toString('hex');
  const missingCartResponse = await fetchStatus(
    new URL('/cart/items', gatewayUrl),
    {
      method: 'POST',
      headers: authHeaders,
      body: { productId: missingProductId, quantity: 1 },
    },
  );
  assert.equal(missingCartResponse.status, 409);
  await seedCart(userId, [
    { productId: missingProductId, name: 'Producto inexistente', amount: 100 },
  ]);
  const missingProductCheckout = await fetchStatus(
    new URL('/orders', gatewayUrl),
    {
      method: 'POST',
      headers: { ...authHeaders, 'idempotency-key': randomUUID() },
      body: {},
    },
  );
  assert.equal(missingProductCheckout.status, 409);
  const missingProductError = JSON.parse(missingProductCheckout.body);
  assert.equal(missingProductError.statusCode, 409);
  assert.equal(missingProductError.code, 'PRODUCT_UNAVAILABLE');
  assert.equal(
    missingProductError.message,
    'El producto desconocido no está disponible en la cantidad solicitada',
  );
  assert.deepEqual(missingProductError.details, {});
  assert.ok(Number.isFinite(Date.parse(missingProductError.timestamp)));
  assert.equal(missingProductError.path, '/api/orders');
  assert.deepEqual(Object.keys(missingProductError).sort(), [
    'code',
    'details',
    'message',
    'path',
    'statusCode',
    'timestamp',
  ]);
  await seedCart(userId, []);

  const missingCallbackKey = await fetchStatus(
    new URL(`/api/orders/order-unknown/payment-result`, new URL(process.env.ORDERS_URL ?? 'http://localhost:3001')),
    { method: 'POST', body: { paymentId: 'payment-unknown', result: 'APPROVED', eventId: 'event-unknown' } },
  );
  assert.equal(missingCallbackKey.status, 401);
  const invalidCallbackKey = await fetchStatus(
    new URL(`/api/orders/order-unknown/payment-result`, new URL(process.env.ORDERS_URL ?? 'http://localhost:3001')),
    {
      method: 'POST',
      headers: { 'x-internal-api-key': 'invalid-key' },
      body: { paymentId: 'payment-unknown', result: 'APPROVED', eventId: 'event-unknown' },
    },
  );
  assert.equal(invalidCallbackKey.status, 401);

  assert.equal(
    (await fetchStatus(new URL('/orders', gatewayUrl))).status,
    401,
  );
  assert.equal(
    (await fetchStatus(new URL('/orders', gatewayUrl), {
      headers: { authorization: 'Bearer invalid.jwt.token' },
    })).status,
    401,
  );
  assert.equal(
    (await fetchStatus(
      new URL('/orders/order-unknown/payment-result', gatewayUrl),
      { method: 'POST', body: {} },
    )).status,
    404,
  );

  const insufficientProduct = await requestJson(
    new URL('/products', catalogUrl),
    {
      method: 'POST',
      body: {
        name: `Insufficient ${randomUUID()}`,
        description: 'Disposable insufficient-stock test',
        price: 100,
        category: 'E2E',
        images: [],
        stock: 1,
        active: true,
      },
    },
  );
  extraProductIds.push(insufficientProduct.id);
  const insufficientCart = await fetchStatus(
    new URL('/cart/items', gatewayUrl),
    {
      method: 'POST',
      headers: authHeaders,
      body: { productId: insufficientProduct.id, quantity: 2 },
    },
  );
  assert.equal(insufficientCart.status, 409);

  const concurrentProduct = await requestJson(
    new URL('/products', catalogUrl),
    {
      method: 'POST',
      body: {
        name: `Concurrent ${randomUUID()}`,
        description: 'Disposable concurrent checkout test',
        price: 100,
        category: 'E2E',
        images: [],
        stock: 1,
        active: true,
      },
    },
  );
  extraProductIds.push(concurrentProduct.id);
  await requestJson(new URL('/cart/items', gatewayUrl), {
    method: 'POST',
    headers: authHeaders,
    body: { productId: concurrentProduct.id, quantity: 1 },
  });
  const concurrentKey = randomUUID();
  const [firstConcurrent, secondConcurrent] = await Promise.all([
    fetchStatus(new URL('/orders', gatewayUrl), {
      method: 'POST',
      headers: { ...authHeaders, 'idempotency-key': concurrentKey },
      body: {},
    }),
    fetchStatus(new URL('/orders', gatewayUrl), {
      method: 'POST',
      headers: { ...authHeaders, 'idempotency-key': concurrentKey },
      body: {},
    }),
  ]);
  assert.ok([201, 200].includes(firstConcurrent.status));
  assert.ok([201, 200].includes(secondConcurrent.status));
  const firstConcurrentBody = JSON.parse(firstConcurrent.body);
  const secondConcurrentBody = JSON.parse(secondConcurrent.body);
  assert.equal(firstConcurrentBody.id, secondConcurrentBody.id);

  const firstBuyer = { id: userId, accessToken };
  const secondBuyer = await createAccount('last-unit-b');
  const lastUnitProduct = await createProduct('Last unit', 1);
  extraProductIds.push(lastUnitProduct.id);
  for (const buyer of [firstBuyer, secondBuyer]) {
    await requestJson(new URL('/cart/items', gatewayUrl), {
      method: 'POST',
      headers: { authorization: `Bearer ${buyer.accessToken}` },
      body: { productId: lastUnitProduct.id, quantity: 1 },
    });
  }
  const simultaneousCheckouts = await Promise.all(
    [firstBuyer, secondBuyer].map((buyer) =>
      fetchStatus(new URL('/orders', gatewayUrl), {
        method: 'POST',
        headers: {
          authorization: `Bearer ${buyer.accessToken}`,
          'idempotency-key': randomUUID(),
        },
        body: {},
      }),
    ),
  );
  assert.deepEqual(
    simultaneousCheckouts.map((result) => result.status).sort(),
    [201, 409],
  );
  const successfulCheckout = JSON.parse(
    simultaneousCheckouts.find((result) => result.status === 201).body,
  );
  const lastUnitAfterCheckouts = await requestJson(
    new URL(`/products/${encodeURIComponent(lastUnitProduct.id)}`, catalogUrl),
  );
  assert.equal(lastUnitAfterCheckouts.stock, 0);
  assert.ok(lastUnitAfterCheckouts.stock >= 0);
  await seedCart(firstBuyer.id, []);
  await seedCart(secondBuyer.id, []);

  const outageBuyer = { id: userId, accessToken };
  await verifyPaymentsOutage(outageBuyer);
  await verifyCatalogOutage(outageBuyer);

  execFileSync(
    'docker',
    [
      'compose', '-f', composeFile, 'exec', '-T', 'mongodb-users',
      'mongosh', 'univalle_users', '--quiet', '--eval',
      `db.users.updateOne({ id: ${JSON.stringify(userId)} }, { $set: { status: 'SUSPENDED' } })`,
    ],
    { stdio: 'ignore' },
  );
  const suspendedOrders = await fetchStatus(new URL('/orders', gatewayUrl), {
    headers: authHeaders,
  });
  assert.equal(suspendedOrders.status, 403);
  const suspendedError = JSON.parse(suspendedOrders.body);
  assert.equal(suspendedError.statusCode, 403);
  assert.equal(suspendedError.code, 'FORBIDDEN');
  execFileSync(
    'docker',
    [
      'compose', '-f', composeFile, 'exec', '-T', 'mongodb-users',
      'mongosh', 'univalle_users', '--quiet', '--eval',
      `db.users.updateOne({ id: ${JSON.stringify(userId)} }, { $set: { status: 'ACTIVE' } })`,
    ],
    { stdio: 'ignore' },
  );

  console.log(
    'Compose E2E passed: happy flow/restoration, callback/API-key guards, JWT rejection, Orders PRODUCT_UNAVAILABLE 409, suspended JWT 403, idempotency, last-unit concurrency, Payments reconciliation, and Catalog clean abort/retry.',
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
  let result;
  try {
    result = text ? JSON.parse(text) : undefined;
  } catch {
    result = text;
  }
  assert.ok(
    response.ok,
    `${method} ${url} returned ${response.status}: ${text}`,
  );
  return result;
}

async function fetchStatus(
  url,
  { method = 'GET', headers = {}, body, timeoutMs = 10_000 } = {},
) {
  const response = await fetch(url, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  return {
    status: response.status,
    body: await response.text(),
  };
}

async function createAccount(label) {
  const accountEmail = `orders-e2e-${label}-${randomUUID()}@correounivalle.edu.co`;
  const registration = await requestJson(new URL('/auth/register', gatewayUrl), {
    method: 'POST',
    body: {
      email: accountEmail,
      firstName: 'Compose',
      lastName: 'E2E',
      password,
      vinculationType: 'ESTUDIANTE',
      marketingConsent: false,
    },
  });
  assert.ok(registration.id);
  testUserIds.push(registration.id);
  allEmails.push(accountEmail);
  assert.equal(registration.status, 'PENDING_VERIFICATION');
  const verificationToken = await waitForVerificationToken(accountEmail);
  await requestJson(new URL('/auth/verify-email', gatewayUrl), {
    method: 'POST',
    body: { token: verificationToken },
  });
  const login = await requestJson(new URL('/auth/login', gatewayUrl), {
    method: 'POST',
    body: { email: accountEmail, password },
  });
  assert.ok(login.accessToken);
  return {
    email: accountEmail,
    id: registration.id,
    accessToken: login.accessToken,
  };
}

async function createProduct(label, stock) {
  return requestJson(new URL('/products', catalogUrl), {
    method: 'POST',
    body: {
      name: `${label} ${randomUUID()}`,
      description: 'Disposable Compose E2E product',
      price: 100,
      category: 'E2E',
      images: [],
      stock,
      active: true,
    },
  });
}

async function seedCart(cartUserId, items) {
  const cartItems = items.map((item) => ({
    productId: item.productId,
    name: item.name,
    unitPrice: { amount: item.amount, currency: 'COP' },
    quantity: 1,
  }));
  const update = `db.carts.updateOne({ userId: ${JSON.stringify(cartUserId)} }, { $set: { items: ${JSON.stringify(cartItems)}, updatedAt: new Date() }, $setOnInsert: { _id: ${JSON.stringify(`cart-e2e-${cartUserId}`)}, userId: ${JSON.stringify(cartUserId)}, createdAt: new Date() } }, { upsert: true });`;
  execFileSync(
    'docker',
    [
      'compose', '-f', composeFile, 'exec', '-T', 'mongodb-orders',
      'mongosh', 'univalle_orders', '--quiet', '--eval', update,
    ],
    { stdio: 'ignore' },
  );
}

async function verifyPaymentsOutage(buyer) {
  const product = await createProduct('Payments outage', 3);
  extraProductIds.push(product.id);
  await requestJson(new URL('/cart/items', gatewayUrl), {
    method: 'POST',
    headers: { authorization: `Bearer ${buyer.accessToken}` },
    body: { productId: product.id, quantity: 1 },
  });

  execFileSync('docker', ['compose', '-f', composeFile, 'stop', 'payments-service']);
  let checkout;
  let failedOrder;
  try {
    checkout = await fetchStatus(new URL('/orders', gatewayUrl), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${buyer.accessToken}`,
        'idempotency-key': randomUUID(),
      },
      body: {},
    });
    assert.equal(checkout.status, 503, `Payments outage checkout: ${checkout.body}`);
    failedOrder = await findOrderForProduct(product.id);
    assert.ok(failedOrder, 'Orders did not persist the checkout during Payments outage');
    assert.equal(failedOrder.status, 'PENDING_PAYMENT');
    assert.equal(failedOrder.paymentId, null);
    assert.equal(failedOrder.reservationIds.length, 1);
    const reserved = await findReservations(failedOrder.reservationIds);
    assert.equal(reserved.length, 1);
    assert.equal(reserved[0].status, 'RESERVED');
    const reservedProduct = await requestJson(
      new URL(`/products/${encodeURIComponent(product.id)}`, catalogUrl),
    );
    assert.equal(reservedProduct.stock, 2);
  } finally {
    execFileSync('docker', ['compose', '-f', composeFile, 'start', 'payments-service']);
  }
  const resolved = await waitForOrderStatus(
    failedOrder._id,
    buyer.accessToken,
    'CANCELLED',
  );
  assert.equal(resolved.status, 'CANCELLED');
  const productAfterRecovery = await requestJson(
    new URL(`/products/${encodeURIComponent(product.id)}`, catalogUrl),
  );
  assert.equal(productAfterRecovery.stock, 3);
}

async function verifyCatalogOutage(buyer) {
  const product = await createProduct('Catalog outage', 3);
  extraProductIds.push(product.id);
  await requestJson(new URL('/cart/items', gatewayUrl), {
    method: 'POST',
    headers: { authorization: `Bearer ${buyer.accessToken}` },
    body: { productId: product.id, quantity: 1 },
  });
  const idempotencyKey = randomUUID();

  execFileSync('docker', ['compose', '-f', composeFile, 'stop', 'catalog-service']);
  let checkout;
  try {
    checkout = await fetchStatus(new URL('/orders', gatewayUrl), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${buyer.accessToken}`,
        'idempotency-key': idempotencyKey,
      },
      body: {},
    });
  } finally {
    execFileSync('docker', ['compose', '-f', composeFile, 'start', 'catalog-service']);
  }
  assert.equal(checkout.status, 503, `Catalog outage checkout: ${checkout.body}`);
  const checkoutError = JSON.parse(checkout.body);
  assert.equal(checkoutError.code, 'DEPENDENCY_UNAVAILABLE');
  assert.equal(await findOrderForProduct(product.id), null);
  assert.deepEqual(await findReservationsForProduct(product.id), []);
  await waitForHttpReady(new URL('/api/docs', catalogUrl));
  const stockBeforeRetry = await requestJson(
    new URL(`/products/${encodeURIComponent(product.id)}`, catalogUrl),
  );
  assert.equal(stockBeforeRetry.stock, 3);

  const recoveredCheckout = await requestJson(new URL('/orders', gatewayUrl), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${buyer.accessToken}`,
      'idempotency-key': idempotencyKey,
    },
    body: {},
  });
  assert.ok(recoveredCheckout.id);
  assert.equal(recoveredCheckout.status, 'PAID');
  const stockAfterRetry = await requestJson(
    new URL(`/products/${encodeURIComponent(product.id)}`, catalogUrl),
  );
  assert.equal(stockAfterRetry.stock, 2);
}

async function findOrderForProduct(productId) {
  return findOrderForProducts([productId]);
}

async function findOrderForProducts(productIds) {
  const query = `const order = db.orders.find({ 'items.productId': { $in: ${JSON.stringify(productIds)} } }).sort({ createdAt: -1 }).limit(1).toArray()[0]; print(JSON.stringify(order ?? null));`;
  const output = execFileSync(
    'docker',
    [
      'compose', '-f', composeFile, 'exec', '-T', 'mongodb-orders',
      'mongosh', 'univalle_orders', '--quiet', '--eval', query,
    ],
    { encoding: 'utf8' },
  ).trim();
  return JSON.parse(output);
}

async function findReservations(reservationIds) {
  const query = `print(JSON.stringify(db.inventory_reservations.find({ reservationId: { $in: ${JSON.stringify(reservationIds)} } }).toArray()));`;
  const output = execFileSync(
    'docker',
    [
      'compose', '-f', composeFile, 'exec', '-T', 'mongodb-catalog',
      'mongosh', 'univalle_catalog', '--quiet', '--eval', query,
    ],
    { encoding: 'utf8' },
  ).trim();
  return JSON.parse(output);
}

async function findReservationsForProduct(productId) {
  const query = `print(JSON.stringify(db.inventory_reservations.find({ productId: ${JSON.stringify(productId)} }).toArray()));`;
  const output = execFileSync(
    'docker',
    [
      'compose', '-f', composeFile, 'exec', '-T', 'mongodb-catalog',
      'mongosh', 'univalle_catalog', '--quiet', '--eval', query,
    ],
    { encoding: 'utf8' },
  ).trim();
  return JSON.parse(output);
}

async function waitForHttpReady(url) {
  let lastResult = 'No response';
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
      lastResult = `HTTP ${response.status}`;
    } catch (error) {
      lastResult = error instanceof Error ? error.message : String(error);
    }
    await delay(500);
  }
  throw new Error(`Service did not become ready at ${url}: ${lastResult}`);
}

async function waitForOrderStatus(id, token, status) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const order = await requestJson(
      new URL(`/orders/${encodeURIComponent(id)}`, gatewayUrl),
      { headers: { authorization: `Bearer ${token}` } },
    );
    if (order.status === status) return order;
    await delay(250);
  }
  throw new Error(`Order ${id} did not reach ${status} within 30 seconds`);
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
  try {
    execFileSync(
      'docker',
      ['compose', '-f', composeFile, 'start', 'payments-service', 'catalog-service'],
      { stdio: 'ignore' },
    );
  } catch (error) {
    cleanupErrors.push(error);
  }
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

  const testProductIds = [...new Set([productId, ...extraProductIds].filter(Boolean))];
  if (testProductIds.length > 0) {
    try {
      execFileSync(
        'docker',
        [
          'compose', '-f', composeFile, 'exec', '-T', 'mongodb-catalog',
          'mongosh', 'univalle_catalog', '--quiet', '--eval',
          `const ids = ${JSON.stringify(testProductIds)}; db.inventory_reservations.deleteMany({ productId: { $in: ids } }); db.products.deleteMany({ _id: { $in: ids.map((id) => ObjectId(id)) } });`,
        ],
        { stdio: 'ignore' },
      );
    } catch (error) {
      cleanupErrors.push(error);
    }
  }

  try {
    const userQuery = `{ $or: [{ id: { $in: ${JSON.stringify(testUserIds)} } }, { email: { $in: ${JSON.stringify(allEmails)} } }] }`;
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
        `db.users.deleteMany(${userQuery});`,
      ],
      { stdio: 'ignore' },
    );
    if (testUserIds.length > 0) {
      const orderQuery = `{ userId: { $in: ${JSON.stringify(testUserIds)} } }`;
      const output = execFileSync(
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
          `const ids = db.orders.find(${orderQuery}, { _id: 1 }).toArray().map((order) => order._id); print(JSON.stringify(ids)); db.orders.deleteMany(${orderQuery}); db.payment_events.deleteMany({ orderId: { $in: ids } }); db.carts.deleteMany({ userId: { $in: ${JSON.stringify(testUserIds)} } });`,
        ],
        { encoding: 'utf8' },
      ).trim();
      const jsonLine = output.split(/\r?\n/).find((line) => /^\s*\[.*\]\s*$/.test(line));
      if (!jsonLine) throw new Error(`Could not read deleted test order IDs: ${output}`);
      const orderIds = JSON.parse(jsonLine);
      if (orderIds.length > 0) {
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
            `db.payments.deleteMany({ orderId: { $in: ${JSON.stringify(orderIds)} } });`,
          ],
          { stdio: 'ignore' },
        );
      }
    } else if (orderId) {
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
