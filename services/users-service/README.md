# Users service

Microservicio REST para la gestión de cuentas de usuario de Univalle Shop. Implementa registro, verificación de correo, inicio de sesión, perfiles, direcciones y operaciones administrativas sobre usuarios.

El servicio está organizado con arquitectura hexagonal: el dominio y los casos de uso se mantienen separados de NestJS y de los adaptadores de infraestructura como MongoDB, SMTP y JWT.

## Tecnologías

- **Node.js 22** y **TypeScript 6**.
- **NestJS 12** para la API HTTP.
- **MongoDB 8** como persistencia (compatible con MongoDB 7).
- **JWT HS256** para autenticación y verificación de correo.
- **Argon2** para hash de contraseñas.
- **Nodemailer** para enviar correo por SMTP; **Mailpit** sirve como servidor SMTP y bandeja de entrada local durante el desarrollo.
- **class-validator** para validar entradas HTTP.
- **Vitest**, **Supertest** y **Oxlint** para pruebas y lint.
- **Docker Compose** opcional para levantar el servicio y sus dependencias.

## Herramientas necesarias

### Para ejecutar con Docker

- Docker Desktop con Docker Compose.
- Git, si vas a clonar el repositorio.

### Para ejecutar sin Docker

- Node.js 22.22 o superior y npm.
- MongoDB Community Server 7 u 8 ejecutándose localmente.
- Mailpit para Windows/macOS/Linux, o cualquier servidor SMTP accesible. Mailpit es necesario para probar el flujo de registro y recibir el enlace de verificación.
- Postman para probar la API, o VS Code con la extensión **REST Client** para enviar las solicitudes de los archivos `.http`.

## Configuración

Desde esta carpeta (`services/users-service`), copia el archivo de ejemplo:

```powershell
Copy-Item .env.example .env
```

Edita `.env` y define al menos un `JWT_SECRET` de 32 bytes o más. En PowerShell puedes generar un valor aleatorio con:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Pega el valor generado como `JWT_SECRET` en `.env`. No compartas ni subas este archivo al repositorio.

| Variable | Descripción | Valor usado por defecto |
|---|---|---|
| `NODE_ENV` | Entorno de ejecución | `development` |
| `PORT` | Puerto HTTP del servicio | `3002` |
| `JWT_SECRET` | Secreto para firmar tokens; mínimo 32 bytes | Secreto de desarrollo solo fuera de producción |
| `MONGODB_URI` | URI de conexión a MongoDB | `mongodb://127.0.0.1:27017/univalle_users` si no se define |
| `MONGODB_DATABASE` | Nombre de base de datos opcional que reemplaza el de la URI | El nombre de la URI |
| `INSTITUTIONAL_EMAIL_DOMAIN` | Dominio permitido para las cuentas, sin `@` | `correounivalle.edu.co` |
| `USERS_SERVICE_URL` | URL base incluida en el enlace de verificación | `http://localhost:3002` |
| `SMTP_HOST` | Host SMTP | `127.0.0.1` |
| `SMTP_PORT` | Puerto SMTP | `1025` |
| `SMTP_SECURE` | TLS implícito; normalmente `false` para Mailpit | `false` |
| `SMTP_FROM` | Remitente del correo | `Univalle Shop <no-reply@univalle.local>` |
| `SMTP_USER` / `SMTP_PASSWORD` | Credenciales SMTP; deben configurarse juntas | Vacías |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Credenciales opcionales para sembrar el primer administrador | Si se omiten, no se crea un administrador |

El `.env.example` usa el puerto `27018` de MongoDB porque está preparado para Docker Compose. Si ejecutas MongoDB instalado directamente en tu equipo, cambia `MONGODB_URI` a:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/univalle_users
```

## Ejecutar con Docker

Desde la carpeta del servicio:

```powershell
Copy-Item .env.example .env
```

Edita `.env` y configura un `JWT_SECRET`; opcionalmente define `ADMIN_EMAIL` y `ADMIN_PASSWORD` para crear un administrador al iniciar. Después, levanta todos los contenedores:

```powershell
docker compose up --build
```

Compose inicia MongoDB, Mailpit y el servicio. La API estará en `http://localhost:3002`, la bandeja de Mailpit en `http://localhost:8025` y SMTP en `localhost:1025`. MongoDB escucha dentro del contenedor en `27017` y se publica en el host en `27018`.

Para detener los contenedores, presiona `Ctrl+C` y ejecuta:

```powershell
docker compose down
```

Los datos de MongoDB permanecen en el volumen `mongo-data`. Para eliminarlos también:

```powershell
docker compose down -v
```

**Advertencia:** `down -v` elimina permanentemente los datos de MongoDB guardados en ese volumen.

## Ejecutar localmente sin Docker

En este modo, MongoDB, Mailpit y el backend se ejecutan directamente en Windows; no es necesario iniciar Docker.

1. Instala MongoDB Community Server 7 u 8 y arranca su servicio desde PowerShell como administrador:

   ```powershell
   Start-Service MongoDB
   ```

   Si el servicio no existe, revisa que MongoDB esté instalado como servicio de Windows o inicia `mongod.exe` con una configuración válida.

2. Descarga Mailpit para tu sistema desde [GitHub Releases](https://github.com/axllent/mailpit/releases/latest), descomprímelo y ejecuta `mailpit.exe` en Windows. Deja esa terminal abierta. Por defecto, Mailpit escucha SMTP en `localhost:1025` y ofrece la bandeja web en `http://localhost:8025`.

3. En `.env`, configura los valores locales:

   ```env
   NODE_ENV=development
   PORT=3002
   JWT_SECRET=pon-aqui-un-secreto-aleatorio-de-al-menos-32-bytes
   MONGODB_URI=mongodb://127.0.0.1:27017/univalle_users
   SMTP_HOST=127.0.0.1
   SMTP_PORT=1025
   SMTP_SECURE=false
   ```

4. En una terminal en la carpeta del servicio, instala dependencias e inicia NestJS:

   ```powershell
   npm ci
   npm run start:dev
   ```

   La API estará en `http://localhost:3002`. Para comprobar que MongoDB y Mailpit están accesibles:

   ```powershell
   Test-NetConnection 127.0.0.1 -Port 27017
   Test-NetConnection 127.0.0.1 -Port 1025
   ```

   En ambas comprobaciones debe aparecer `TcpTestSucceeded: True`.

5. Registra una cuenta y abre `http://localhost:8025` para leer el correo de verificación. Sigue el enlace y luego inicia sesión.

Si configuras `ADMIN_EMAIL` y `ADMIN_PASSWORD`, ambos deben estar definidos y cumplir las reglas de dominio y contraseña. El servicio crea ese administrador automáticamente al iniciar, ya activo y verificado. Si ese correo ya existe como cuenta no administradora, el servicio no lo cambia y falla al iniciar.

### Compilar y ejecutar como producción

Con MongoDB y SMTP configurados y disponibles:

```powershell
npm ci
npm run build
npm run start:prod
```

En producción `JWT_SECRET` es obligatorio. Configura un servidor SMTP real y no uses el secreto de desarrollo ni Mailpit.

## API

documentacion de swagger: http://localhost:3002/api/docs
Base URL local: `http://localhost:3002`. No hay un prefijo global adicional.

Las solicitudes de ejemplo están en [auth.http](./auth.http) y [users.http](./users.http). En VS Code, abre cualquiera de esos archivos con la extensión REST Client y selecciona **Send Request**. También puedes copiar las solicitudes en Postman. Para endpoints protegidos, configura:

```http
Authorization: Bearer <accessToken>
```

### Autenticación

| Método y ruta | Descripción | Acceso |
|---|---|---|
| `POST /auth/register` | Registra una cuenta `CUSTOMER` pendiente de verificación. Requiere `email`, `firstName`, `lastName`, `password` y `vinculationType`. El correo debe usar el dominio institucional configurado. | Público |
| `GET /auth/verify-email?token=...` | Verifica la cuenta usando el token del enlace enviado por correo. | Público |
| `POST /auth/verify-email` | Alternativa para verificar la cuenta; recibe `{ "token": "..." }`. | Público |
| `POST /auth/login` | Inicia sesión con `{ "email": "...", "password": "..." }`; responde con `accessToken` y usuario. La cuenta debe estar verificada y activa. | Público |

`vinculationType` acepta `ESTUDIANTE`, `DOCENTE` o `ADMINISTRATIVO`. El registro no devuelve el token de verificación: el mensaje se captura en Mailpit durante el desarrollo. Los enlaces de verificación vencen en 24 horas. Los tokens de acceso vencen en una hora. El inicio de sesión está limitado a 5 intentos por minuto y dirección IP.

### Perfil y direcciones

Todas estas rutas requieren un access token.

| Método y ruta | Descripción |
|---|---|
| `GET /users/me` | Obtiene el perfil actual y sus direcciones. |
| `PATCH /users/me` | Actualiza los campos enviados: `firstName`, `lastName`, `vinculationType`. |
| `PATCH /users/me/password` | Cambia la contraseña con `currentPassword` y `newPassword`. |
| `POST /users/me/addresses` | Agrega una dirección con `street`, `city`, `department`, `phone` y `isDefault` opcional. |
| `PATCH /users/me/addresses/:id` | Actualiza parcialmente una dirección. Los campos omitidos conservan su valor. |
| `PATCH /users/me/addresses/:id/default` | Marca la dirección como predeterminada. |
| `DELETE /users/me/addresses/:id` | Elimina la dirección. |

El servicio permite hasta cinco direcciones por usuario. Ejemplo para agregar una:

```json
{
  "street": "Calle 13 # 100-00",
  "city": "Cali",
  "department": "Valle del Cauca",
  "phone": "+57 300 1234567",
  "isDefault": true
}
```

### Administración

Estas rutas requieren un access token de un usuario con rol `ADMIN`.

| Método y ruta | Descripción |
|---|---|
| `GET /users` | Lista usuarios. |
| `PATCH /users/:id/status` | Actualiza el estado usando `{ "status": "SUSPENDED" }` o `{ "status": "ACTIVE" }`. |
| `PATCH /users/:id/role` | Cambia el rol usando `{ "role": "CUSTOMER" }` o `{ "role": "ADMIN" }`. |

Si no hay administrador, define `ADMIN_EMAIL` y `ADMIN_PASSWORD` en `.env` y reinicia el servicio. El correo debe pertenecer al dominio institucional permitido.

### Validación y respuestas de error

El servicio valida los cuerpos de las solicitudes; rechaza propiedades no reconocidas y valores fuera de las reglas de cada campo. Las contraseñas deben tener al menos 8 caracteres, una mayúscula, un número y un símbolo. Las direcciones requieren calle, ciudad, departamento y un teléfono válido. Los errores de dominio se traducen a respuestas HTTP como `400`, `401`, `403`, `404` o `409`; un error `500` indica una excepción no controlada, que debe investigarse en la terminal donde corre el backend.

### Solución de problemas

- **`ECONNREFUSED 127.0.0.1:1025` al registrar:** Mailpit u otro servidor SMTP no está ejecutándose o no escucha en ese puerto. Inicia Mailpit y comprueba la conexión con `Test-NetConnection 127.0.0.1 -Port 1025`.
- **El registro devuelve `500`, pero la cuenta aparece en MongoDB:** el servicio guarda la cuenta antes de enviar el correo. Si falla SMTP, la cuenta queda en estado pendiente de verificación aunque el endpoint responda con error. Inicia SMTP y revisa Mailpit. No repitas el registro con el mismo correo; ya está registrado. Recupera la cuenta pendiente o, si es solo un dato desechable local, elimínala usando tus herramientas de administración de MongoDB antes de volver a registrarla.
- **MongoDB no conecta:** confirma que el servicio de MongoDB esté activo y que `MONGODB_URI` apunte al puerto correcto. Una instalación local suele usar `27017`; Compose publica MongoDB en `27018`.

## Seguridad e integración

Los JWT usan HS256 e incluyen el issuer `users-service`. El servicio devuelve `sub`, `email` y `role` en el access token. Un gateway que valide estos tokens debe usar el mismo `JWT_SECRET`, validar firma, expiración e issuer. El gateway de este repositorio todavía es una plantilla y no reenvía solicitudes del servicio de usuarios. Los servicios posteriores deben basar su autorización en claims ya verificados y no confiar en encabezados de identidad enviados directamente por el cliente.

Mailpit captura correos para desarrollo y no verifica que la dirección exista ni entrega mensajes a Internet. Para producción, configura un proveedor SMTP real mediante `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM` y, si aplica, `SMTP_USER` y `SMTP_PASSWORD`.

## Pruebas y calidad

```powershell
npm test
npm run test:e2e
npm run lint
npm run build
```
