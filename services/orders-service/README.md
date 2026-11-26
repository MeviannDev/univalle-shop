# Orders Service

## Requisitos

- Node.js 22
- MongoDB (replica set requerido para transacciones de callbacks de pago)

## Desarrollo

```bash
npm install
Copy-Item .env.example .env # omitir si .env ya existe
npm run build
npm run start:dev
```

La configuración está en `.env.example`; `.env` se ignora en Git. Para
desarrollo aislado, conserva `USERS_ADAPTER`, `CATALOG_ADAPTER` y
`PAYMENTS_ADAPTER` en `stub`. El adaptador de catálogo incluye
`demo-notebook` y `demo-shirt`, y `STUB_PAYMENT_RESULT` acepta `PENDING`,
`APPROVED` o `REJECTED`.

Para una integración real, cambia los adaptadores a `http` y define las URLs
de los servicios. `JWT_SECRET` debe coincidir exactamente con Users; Orders
valida la firma localmente y consulta `GET /users/me` para verificar el estado
y rol vigentes. La integración usa Users en `3002`, Catalog en `3006` y Payments
en `3003` durante el desarrollo local. El contrato observado y las diferencias
por cerrar están en [docs/SDD.md](./docs/SDD.md).

Orders consulta el producto con `GET /products/:id` y utiliza las rutas
internas de reserva de Catalog (`POST /inventory/reservations`, `POST
/inventory/reservations/:id/commit` y `DELETE /inventory/reservations/:id`).
Configura `INTERNAL_SERVICE_API_KEY` con el mismo valor en ambos servicios.
Catalog requiere MongoDB en modo replica set para las transacciones de stock.

Los tokens de desarrollo se pueden solicitar en `POST /api/dev/auth/token`
solo si `NODE_ENV` no es `production` y `USERS_ADAPTER=stub`, enviando, por
ejemplo, `{"role":"CUSTOMER"}`. No se debe usar esta clave JWT de ejemplo ni
la API key interna de ejemplo fuera del desarrollo local.

- Salud: `GET /api/health`.
- Swagger: `GET /docs` (configurable con `SWAGGER_PATH`).
- Puerto: `PORT` (por defecto `3001`).
- Pruebas: `npm run test` y `npm run test:e2e`.

Los resultados de pago se guardan junto con el evento en una transacción
MongoDB; por ello, el MongoDB de integración/despliegue debe soportar
transacciones (replica set o clúster sharded).
