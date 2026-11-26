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
