# Payments Service

Payments currently exposes a simulated payment API without a global `api`
prefix. It listens on port `3003` by default; Swagger is at `/api/docs`.

## Endpoints

### `POST /payments/simulate`

Creates and persists a simulated payment. The required body is:

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
`pending`, `processing`, `approved`, `rejected` or `refunded`. If omitted, the
simulation approves methods containing `card`, `pse` or `wallet`, and rejects
other methods. A successful response is `201` with the persisted Payment
(`id`, `orderId`, `userId`, numeric `amount`, `currency`, `method`, lowercase
`status`, `createdAt`, and optional `completedAt`).

Invalid DTOs return `400`; uncaught application or persistence errors currently
return `500`.

### `GET /payments/:id`

Returns the payment with that ID, or `null` when it does not exist (`200`).

### `GET /payments/order/:orderId`

Returns the first payment matching the order, or `null` if there is none
(`200`).

## Orders integration status

This simulation API does not currently accept an idempotency key, send a
callback to Orders, or provide cancel/refund operations. The Orders integration
phase will add and document the minimum internal contract needed for safe
checkout and event deduplication.

## Development

```bash
npm install
npm run start:dev
npm run build
npm test
```
