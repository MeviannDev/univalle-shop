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

Requiere Node.js 22 o superior y MongoDB local. Copia `.env.example` a `.env`,
ajusta `MONGODB_URI` si es necesario y ejecuta:

```bash
npm install
npm run start:dev
```

O ejecuta el API y MongoDB en contenedores:

```bash
docker compose up --build
```

El API queda disponible en `http://localhost:3006`; MongoDB persiste sus datos
en el volumen `catalog-data`. El puerto del API se puede cambiar con `PORT`.

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
productos inexistentes devuelven `404`.

## Verificación

```bash
npm test
npm run test:e2e
npm run lint
npm run build
```
