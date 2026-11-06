# Users service

Microservicio NestJS para cuentas, autenticación y direcciones. Está organizado por arquitectura hexagonal: el dominio y los casos de uso no dependen de NestJS ni de MongoDB; los controladores, JWT, Argon2, correo de consola y MongoDB son adaptadores.

## Requisitos

- Docker Desktop con Docker Compose, recomendado para iniciar el servicio y su MongoDB.
- O Node.js 22.22 o superior y MongoDB 7/8 para ejecutarlo localmente.

## Inicio rápido con Docker

Desde esta carpeta (`services/users-service`):

```powershell
Copy-Item .env.example .env
# Edita .env y define JWT_SECRET, ADMIN_EMAIL y ADMIN_PASSWORD.
# Puedes generar JWT_SECRET con:
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
docker compose up --build
```

La API estará en `http://localhost:3002`; MongoDB persiste sus datos en el volumen `mongo-data`. Para detener los contenedores, usa `Ctrl+C` y luego `docker compose down`. Para borrar también la base de datos local, usa `docker compose down -v`.

El primer administrador se crea al iniciar si se configuran `ADMIN_EMAIL` y `ADMIN_PASSWORD`. Usa una cuenta institucional y una contraseña que cumpla las reglas. Si se configura solo una de esas variables, el servicio falla al iniciar intencionalmente.

## Inicio local sin Docker

1. Inicia MongoDB y define `MONGODB_URI` (por defecto `mongodb://127.0.0.1:27017/univalle_users`).
2. Copia `.env.example` a `.env` y completa al menos `JWT_SECRET`.
3. Ejecuta:

```powershell
npm ci
npm run start:dev
```

Para compilar y ejecutar como producción:

```powershell
npm run build
npm run start:prod
```

## Variables de entorno

| Variable | Uso | Valor local predeterminado |
|---|---|---|
| `PORT` | Puerto HTTP | `3002` |
| `MONGODB_URI` | URI de MongoDB | `mongodb://127.0.0.1:27017/univalle_users` |
| `MONGODB_DATABASE` | Nombre de base de datos opcional | El de la URI |
| `JWT_SECRET` | Secreto HS256 compartido con el gateway | Solo en desarrollo se usa un valor de desarrollo; en producción es obligatorio |
| `INSTITUTIONAL_EMAIL_DOMAIN` | Dominio permitido, sin `@` | `correounivalle.edu.co` |
| `USERS_SERVICE_URL` | URL base incluida en el correo de verificación | `http://localhost:<PORT>` |
| `ADMIN_EMAIL` | Email institucional para crear el primer admin | No se crea admin si se omite |
| `ADMIN_PASSWORD` | Contraseña inicial del admin | No se crea admin si se omite |

No uses el secreto predeterminado ni credenciales de desarrollo fuera de un entorno local.

## API

Puedes probar los endpoints desde VS Code abriendo [auth.http](./auth.http) y [users.http](./users.http) y seleccionando **Send Request** encima de cada solicitud. En `auth.http`, registra el usuario, copia el token del enlace que aparece en los logs, verifica el correo y luego inicia sesión. En `users.http`, pega el `accessToken` de la respuesta de login; las operaciones administrativas requieren iniciar sesión con el administrador configurado mediante `ADMIN_EMAIL` y `ADMIN_PASSWORD`.

- `POST /auth/register` — `email`, `firstName`, `lastName`, `password`, `vinculationType`. Siempre crea `CUSTOMER` en `PENDING_VERIFICATION`.
- `POST /auth/verify-email` — recibe `{ "token": "..." }`. El enlace de consola también se puede abrir mediante `GET /auth/verify-email?token=...`.
- `POST /auth/login` — recibe email y contraseña; responde con `{ accessToken, user }`.
- `GET /users/me`, `PATCH /users/me`, `PATCH /users/me/password`.
- `POST /users/me/addresses`, `PATCH|DELETE /users/me/addresses/:id`, `PATCH /users/me/addresses/:id/default`.
- `GET /users`, `PATCH /users/:id/status`, `PATCH /users/:id/role` — requieren rol `ADMIN`.

Los endpoints protegidos esperan `Authorization: Bearer <accessToken>`. El token dura una hora; logout consiste en descartarlo en el cliente. Login está limitado a 5 intentos por minuto y dirección IP.

### ¿De dónde salen los tokens?

Son dos tokens distintos. Al registrarse, el usuario todavía no recibe un token de sesión porque su cuenta está pendiente de verificar y no puede iniciar sesión. El enlace con el token de verificación se imprime en la terminal o en los logs del contenedor `users-service` (con Docker: `docker compose logs -f users-service`). Copia ese token y envíalo a `POST /auth/verify-email`; la respuesta solo confirma `{ "verified": true }`. Después inicia sesión en `POST /auth/login`: su respuesta JSON contiene `accessToken`. Ese es el token que el cliente guarda y manda como `Authorization: Bearer ...` a las rutas protegidas. El adaptador de correo actual es simulado, por eso el enlace no llega a una bandeja de entrada.

### Ejemplo de registro

```powershell
Invoke-RestMethod -Method Post http://localhost:3002/auth/register `
  -ContentType 'application/json' `
  -Body '{"email":"estudiante@correounivalle.edu.co","firstName":"Ana","lastName":"Valencia","password":"Valle2026!","vinculationType":"ESTUDIANTE"}'
```

Copia del log de `users-service` el enlace de verificación simulado, complétalo en el navegador o envía su token a `POST /auth/verify-email`, y luego inicia sesión.

## Gateway y seguridad

El gateway de este repositorio todavía es una plantilla, no valida ni reenvía solicitudes de usuario. Para integrarlo, comparte `JWT_SECRET` con el servicio y valida JWT HS256, expiración e issuer `users-service`. El servicio devuelve `sub`, `email` y `role` en el token. Los servicios posteriores deberían autorizar el rol validado por el gateway; no deben confiar en encabezados `x-user-*` que el cliente pueda enviar directamente.

La verificación de correo actualmente se imprime en los logs y no demuestra que el buzón exista. Para enviar correo real, reemplaza `ConsoleEmailSender` por un adaptador SMTP sin cambiar dominio ni casos de uso.

## Pruebas y calidad

```powershell
npm test
npm run test:e2e
npm run lint
npm run build
```
