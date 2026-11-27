# API Gateway

El API Gateway es el punto de entrada HTTP de la aplicación y permite centralizar
el acceso a los servicios backend. Reenvía las solicitudes conservando el método,
la ruta, los parámetros de consulta, el cuerpo y el encabezado `Authorization`.

Esta estructura está preparada para incorporar otros servicios con sus propias
rutas y direcciones de destino.

## Desarrollo local

Inicia el gateway y los servicios backend que necesites. Desde esta carpeta,
ejecuta:

```bash
npm run start:dev
```

El puerto del gateway se configura con `PORT` (por defecto, `3000`). Configura
la URL de cada servicio backend mediante la variable de entorno correspondiente.
El proxy de Users usa `USERS_SERVICE_URL` (por defecto
`http://localhost:3002`) y el de Orders usa `ORDERS_SERVICE_URL` (por defecto
`http://localhost:3001/api`). Orders tiene el prefijo `/api` en su servicio,
por lo que esa parte debe incluirse en la URL de destino. Las URLs deben ser
absolutas y usar HTTP o HTTPS.

El Gateway publica `/auth/*` y `/users/*` hacia Users, y `/cart/*`,
`/orders/*` y `/admin/orders/*` hacia Orders. Las rutas de Orders se reenvían
conservando el prefijo del servicio; por ejemplo, `GET /orders` llega a
`GET /api/orders`. Catalog, Payments, Search y Recommendations no se publican
mediante el Gateway. Si el Gateway es el punto de entrada público, evita
exponer directamente los servicios backend.

`POST /orders/:id/payment-result` es un callback interno de Payments y no se
publica desde el Gateway. Las solicitudes externas a esa ruta reciben `404`.
Payments debe llamar directamente a `ORDERS_CALLBACK_BASE_URL` dentro de la
red de Compose e incluir `X-Internal-Api-Key`.

## Docker Compose

Desde la carpeta `services`, inicia el entorno completo con:

```bash
docker compose -f compose.yaml up --build
```

El Gateway queda disponible en `http://localhost:3000`. Las bases de Orders y
Catalog se ejecutan como replica sets de un solo nodo para habilitar sus
transacciones. El resto de los servicios tiene bases MongoDB independientes.
Las credenciales incluidas como valores predeterminados son exclusivamente para
desarrollo; configúralas mediante variables de entorno antes de un despliegue.

Con el stack activo, ejecuta el flujo automatizado desde esta carpeta:

```bash
npm run test:e2e:compose
```

La prueba cubre registro y pago aprobado, cancelación y restauración de stock,
producto inexistente, JWT inválido y usuario suspendido, callback interno,
idempotencia y dos usuarios compitiendo por la última unidad. También detiene
Payments durante un checkout y verifica la cancelación y liberación al
reconciliar. Para ese escenario configura antes de iniciar Compose un intervalo
de `1000` ms, una antigüedad pendiente de `15000` ms y un lease de `10000` ms
mediante `ORDERS_RECONCILIATION_INTERVAL_MS`,
`ORDERS_RECONCILIATION_PENDING_AGE_MS` y
`ORDERS_RECONCILIATION_LEASE_MS`. Ejemplo desde la raíz del repositorio:

```powershell
$env:ORDERS_RECONCILIATION_INTERVAL_MS = "1000"
$env:ORDERS_RECONCILIATION_PENDING_AGE_MS = "15000"
$env:ORDERS_RECONCILIATION_LEASE_MS = "10000"
docker compose -f services\compose.yaml up -d --build
```

Si Catalog no está disponible antes de crear la orden, Orders devuelve
`503 DEPENDENCY_UNAVAILABLE` sin persistir orden ni reserva. La prueba verifica
ese estado limpio y repite el checkout tras restaurar Catalog; no afirma que el
reconciliador haya resuelto una orden en ese escenario. La prueba elimina sus
usuarios, órdenes, reservas y productos desechables.

## Health checks

- `GET /health`: indica si el proceso del gateway está activo.
- `GET /health/ready`: indica si el gateway puede atender solicitudes según la
  disponibilidad de sus dependencias. Devuelve `200` cuando la comprobación es
  satisfactoria y `503` cuando Users u Orders no están disponibles. Consulta
  Users en `/api/docs` y Orders en `/api/health`, con un timeout de 3 segundos.

## Ejemplos

- `POST http://localhost:3000/auth/login`
- `GET http://localhost:3000/users/me` (requiere token Bearer)
- `GET http://localhost:3000/cart` (requiere token Bearer)
- `GET http://localhost:3000/orders` (requiere token Bearer)

La telemetría de NestJS Observe está desactivada si no se configuran credenciales.
Para habilitarla, define `OBSERVE_APP_KEY` y `OBSERVE_APP_SECRET` con credenciales
válidas de Observe; ambas variables deben estar presentes.
