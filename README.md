# Univalle Shop - Servicio de búsqueda

Microservicio NestJS para buscar productos activos de Univalle Shop. Mantiene
su propio índice en MongoDB y no consulta directamente la base de datos del
Servicio de Catálogo.

## Arquitectura hexagonal

```text
HTTP (adaptadores de entrada)
  SearchController / ProductIndexController
                |
                v
Casos de uso
  SearchProductsUseCase / IndexProductUseCase / RemoveIndexedProductUseCase
                |
                v
Puerto de salida
  ProductSearchRepository
                |
                v
MongoProductSearchRepository (adaptador MongoDB)
```

El dominio define `SearchableProduct`. Los casos de uso dependen del puerto y
no de NestJS ni de Mongoose. `SearchModule` conecta el puerto con el adaptador
MongoDB mediante inyección de dependencias.

## API

### Buscar productos

```http
GET /search?q=cuaderno&page=1&limit=20
```

`q` es obligatorio (máximo 200 caracteres); `page` inicia en 1 y `limit`
admite valores de 1 a 100. Solo se devuelven productos activos, ordenados por
relevancia de texto. La respuesta incluye `items`, `total`, `page`, `limit` y
`totalPages`.

### Mantener el índice desde Catálogo

```http
PUT /internal/search/products/:productId
Content-Type: application/json

{
  "name": "Cuaderno",
  "description": "Cuaderno universitario de 100 hojas",
  "category": "Papelería",
  "price": 12000,
  "imageUrl": "https://example.com/cuaderno.jpg",
  "isActive": true
}
```

La operación es idempotente: crea o actualiza el producto indexado.

```http
DELETE /internal/search/products/:productId
```

El Servicio de Catálogo debe sincronizar altas, cambios y eliminaciones con
estos endpoints. Las rutas `/internal` deben quedar protegidas y accesibles
solo entre servicios en el API Gateway o en la red privada antes de desplegar
en un entorno compartido.

## Ejecutar localmente

Requiere Node.js y Docker:

```bash
npm install
docker compose up --build
```

El servicio queda en `http://localhost:3000` y MongoDB usa una base propia
llamada `univalle_search`. Para ejecutar pruebas y compilación:

```bash
npm test
npm run test:e2e
npm run build
```

La URI de MongoDB se configura con `MONGODB_URI`; por defecto se usa
`mongodb://localhost:27017/univalle_search`.
