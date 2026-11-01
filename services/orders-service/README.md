# Orders Service

## Requisitos

- Node.js 22
- MongoDB

## Desarrollo

```bash
npm install
Copy-Item .env.example .env
npm run build
npm run start:dev
```

La configuración inicial está en `.env.example`:

- `PORT`: puerto HTTP (por defecto, `3001`).
- `MONGODB_URI`: URI de conexión a MongoDB.
- `MONGODB_DATABASE`: base de datos del servicio.
- `SWAGGER_PATH`: ruta de la documentación (por defecto, `docs`).

La comprobación de salud está disponible en `GET /api/health` y la documentación
interactiva de Swagger en `GET /docs`.
