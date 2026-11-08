# API Gateway

El gateway enruta al `users-service` las solicitudes HTTP que comienzan con
`/auth` o `/users`. Conserva el método, la ruta, los parámetros de consulta, el
cuerpo y el encabezado `Authorization`.

## Desarrollo local

Inicia `users-service` desde `services/users-service` y luego ejecuta el
gateway:

```bash
npm run start:dev
```

El gateway escucha en el puerto `3000` y, de forma predeterminada, reenvía al
servicio en `http://localhost:3002`. Para cambiar la dirección del servicio,
configura `USERS_SERVICE_URL`.

Ejemplos:

- `POST http://localhost:3000/auth/login`
- `GET http://localhost:3000/users/me` (requiere token Bearer)

Las rutas no relacionadas con autenticación o usuarios continúan en el
controlador principal del gateway.
