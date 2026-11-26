# Payments Service

Payments currently exposes a simulated payment API without a global `api`
prefix. It listens on port `3003` by default; Swagger is at `/api/docs`.

## Endpoints

### `POST /payments/simulate`

Creates or returns the simulated payment for an idempotency key. This is an
internal endpoint and requires `X-Internal-Api-Key` and `Idempotency-Key`
headers. The required body is:

```json
{
  "orderId": "order_123",
  "userId": "user_123",
  "amount": 125000,
  "currency": "COP",
  "method": "card"
}
```

`description` and `status` are optional. `status` accepts lowercase values
`pending`, `processing`, `approved`, `rejected`, `refunded` or `cancelled`.
When the body omits `status`, `PAYMENT_SIMULATION_RESULT` can force `pending`,
`approved` or `rejected`; `auto` preserves the existing method-based behavior.
A successful response is `201` with the persisted Payment (`id`, `orderId`,
`userId`, numeric `amount`, `currency`, `method`, lowercase `status`, and
timestamps). Repeating the same key and payload returns the original payment;
reusing the key with a different order, user, amount, currency or method returns
`409`.

Invalid DTOs or a missing key return `400`, an invalid internal key returns
`401`, a missing internal key configuration returns `503`, and idempotency
conflicts return `409`.

### `POST /payments/:id/cancel`

Requires the same internal API key and an `Idempotency-Key` header. The body is
`{ "orderId": "order_123" }`. A pending payment becomes `cancelled`, an approved
payment becomes `refunded`, and repeating the same key is safe. A different
key for a previously cancelled payment returns `409`; a missing payment returns
`404`.

### `GET /payments/:id`

Returns the payment with that ID, or `null` when it does not exist (`200`).

### `GET /payments/order/:orderId`

Returns the first payment matching the order, or `null` if there is none
(`200`).

## Orders callback contract

When `PAYMENT_CALLBACK_ENABLED=true`, approved and rejected payments create a
durable pending callback in the payment document. The dispatcher sends
`POST {ORDERS_CALLBACK_BASE_URL}/{orderId}/payment-result` with
`X-Internal-Api-Key` and this body:

```json
{
  "paymentId": "payment_123",
  "result": "APPROVED",
  "eventId": "stable-event-id"
}
```

Delivery is at least once: `eventId` remains stable for each retry, and Orders
deduplicates the event transactionally with its order update. Callback attempts
are bounded by `PAYMENT_CALLBACK_MAX_ATTEMPTS`; undelivered payments remain
queryable in MongoDB for operational recovery. The result is snapshotted when
the event is created, so refunding/cancelling a payment does not mutate an
already queued callback. A callback conflict (including the same event ID with
a different result) is not acknowledged by Orders.

The callback poll interval and HTTP timeout are configurable. Keep the same
internal API key in Orders and Payments. Set `PAYMENT_CALLBACK_ENABLED=false`
when running Payments in isolation.

## Configuration and development

Copy `.env.example` to `.env`. The settings there cover the local MongoDB URI,
shared internal key, simulated result, callback URL, timeout, polling interval
and retry cap.

## Development

```bash
npm install
npm run start:dev
npm run build
npm test
```
