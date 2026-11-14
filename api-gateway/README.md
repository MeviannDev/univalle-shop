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
Actualmente, el servicio de usuarios usa `USERS_SERVICE_URL`, cuyo valor
predeterminado es `http://localhost:3002`. Las URLs deben ser absolutas y usar
HTTP o HTTPS.

Al integrar un servicio nuevo, configura su dirección y define las rutas que el
gateway debe reenviarle. Si el gateway es el punto de entrada público, evita
exponer directamente los servicios backend.

## Health checks

- `GET /health`: indica si el proceso del gateway está activo.
- `GET /health/ready`: indica si el gateway puede atender solicitudes según la
  disponibilidad de sus dependencias. Devuelve `200` cuando la comprobación es
  satisfactoria y `503` cuando una dependencia no está disponible. Actualmente,
  verifica el servicio de usuarios; la comprobación puede ampliarse al integrar
  otros servicios. La consulta tiene un timeout de 3 segundos.

## Ejemplos

- `POST http://localhost:3000/auth/login`
- `GET http://localhost:3000/users/me` (requiere token Bearer)

La telemetría de NestJS Observe está desactivada si no se configuran credenciales.
Para habilitarla, define `OBSERVE_APP_KEY` y `OBSERVE_APP_SECRET` con credenciales
válidas de Observe; ambas variables deben estar presentes.
