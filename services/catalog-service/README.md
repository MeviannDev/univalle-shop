# Univalle Shop - Servicio de catálogo

Microservicio REST para administrar los productos del catálogo: descripción,
imágenes, categoría, precio y existencias. Está implementado con NestJS,
TypeScript y MongoDB, siguiendo arquitectura hexagonal.

## Arquitectura

```text
src/catalog/
  domain/                 Entidad Product y reglas del dominio
  application/
    ports/                Contratos que necesita la aplicación
    use-cases/            Casos de uso independientes de Nest/Mongo
  infrastructure/
    http/                 Adaptador REST, DTO, filtro y validación de IDs
    persistence/mongo/    Adaptador MongoDB y esquema Mongoose
  catalog.module.ts       Configuración de dependencias del microservicio
```

El dominio no depende de la infraestructura; los casos de uso dependen del
puerto `ProductRepository`, y NestJS enlaza ese puerto con
`MongoProductRepository`. Así se pueden cambiar el transporte o la base de
datos sin trasladar reglas de negocio al controlador o al esquema.

## Ejecutar localmente

Requiere Node.js 22 o superior. Copia `.env.example` a `.env` y ejecuta:

```bash
npm install
npm run start:dev
```

Para ejecutar el API fuera de Docker, `MONGODB_URI` debe apuntar a un replica
set que anuncie un host accesible desde el proceso local (por ejemplo,
`localhost:27017`). La reserva usa transacciones locales de MongoDB, por lo que
una instancia standalone no es suficiente. Para ejecutar API y MongoDB juntos
en Docker, usa:

```bash
docker compose up --build
```

El API queda disponible en `http://localhost:3006`; MongoDB persiste sus datos
en el volumen `catalog-data`. El puerto del API se puede cambiar con `PORT`.
En Compose, el replica set anuncia el nombre interno `mongo`, y el API recibe
su URI del propio `docker-compose.yml`.

## Documentación Swagger

Con el API en ejecución, abre `http://localhost:3006/api/docs` para explorar y
probar los endpoints. La especificación OpenAPI en JSON está disponible en
`http://localhost:3006/api/docs-json`.

## API

La validación de entrada rechaza campos no permitidos y datos inválidos.

| Método   | Ruta            | Acción                  |
| -------- | --------------- | ----------------------- |
| `POST`   | `/products`     | Crear producto          |
| `GET`    | `/products`     | Listar productos        |
| `GET`    | `/products/:id` | Consultar producto      |
| `PATCH`  | `/products/:id` | Actualizar parcialmente |
| `DELETE` | `/products/:id` | Eliminar producto       |

Ejemplo de creación:

```json
{
  "name": "Cuaderno",
  "description": "Cuaderno universitario",
  "price": 12000,
  "category": "Papelería",
  "images": ["https://example.com/cuaderno.jpg"],
  "stock": 25
}
```

`price` debe ser un número no negativo y `stock` un entero no negativo. Los
errores de validación devuelven `400`; los IDs inválidos devuelven `400` y los
productos inexistentes devuelven `404`. No se puede eliminar un producto con
reservas activas; esa operación responde `409`.

### Contrato consumido por Orders

Catalog no tiene prefijo global `api`; Orders debe consultar
`GET /products/:id` en el puerto interno del servicio. La respuesta real contiene
`id`, `name`, `description`, `price` (número), `stock` (entero) y `active`
(booleano), además de categoría, imágenes y fechas. Un ID inválido responde
`400`; un producto inexistente responde `404`. Orders interpreta `active` como
disponibilidad y valida la cantidad contra el stock.

El contrato no publica moneda en el producto; Orders interpreta el precio en
COP. Para checkout, Catalog ofrece además estas rutas internas, protegidas por
`X-Internal-Api-Key`. Configura `INTERNAL_SERVICE_API_KEY` con el mismo secreto
en Orders y Catalog (al menos 32 bytes):

| Método   | Ruta                                            | Respuesta / errores                                                                                                                                                                                                                     |
| -------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST`   | `/inventory/reservations`                       | Recibe `{ "reservationId": "...", "productId": "<ObjectId>", "quantity": 2 }`; devuelve estado `RESERVED`. `400` cuerpo inválido, `401` clave inválida, `404` producto inexistente, `409` stock insuficiente o referencia en conflicto. |
| `POST`   | `/inventory/reservations/:reservationId/commit` | Confirma una reserva idempotentemente. `401` clave inválida, `404` reserva inexistente, `409` reserva liberada o inconsistente.                                                                                                         |
| `DELETE` | `/inventory/reservations/:reservationId`        | Libera y repone stock idempotentemente. `401` clave inválida, `409` reserva previamente confirmada.                                                                                                                                     |

La reserva decrementa `stock` disponible e incrementa `reservedStock` en una
transacción con el documento de reserva. `commit` consume el retenido y
`release` lo devuelve. MongoDB debe operar como replica set; las operaciones
son atómicas dentro de Catalog, no entre bases de distintos servicios.

## Verificación

```bash
npm test
npm run test:e2e
npm run lint
npm run build
```
