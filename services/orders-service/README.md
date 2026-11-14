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
de los servicios. Las rutas y esquemas usados por los adaptadores HTTP están
descritos en [docs/SDD.md](./docs/SDD.md); deben confirmarse con los servicios
compañeros antes de desplegar.

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
