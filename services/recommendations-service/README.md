# Recommendations Service

Servicio para registrar interacciones y generar recomendaciones ordenadas para
un usuario. El servicio recibe los productos candidatos y sus categorías; no
consulta el catálogo ni modifica otros servicios.

## Registrar interacciones

Registra las vistas y compras para que el motor aprenda preferencias:

```http
POST http://localhost:3004/recommendations/events
Content-Type: application/json
```

```json
{
  "userId": "user-123",
  "productId": "product-42",
  "category": "tecnologia",
  "type": "view"
}
```

`type` acepta `view` o `purchase`. Se deben registrar las interacciones reales
del usuario; una compra excluye ese producto de sus recomendaciones futuras.

## Generar recomendaciones

```http
POST http://localhost:3004/recommendations/generate
Content-Type: application/json
```

```json
{
  "userId": "user-123",
  "productIds": ["product-41", "product-42", "product-99"],
  "category": "tecnologia",
  "productCategories": {
    "product-41": "tecnologia",
    "product-42": "audio",
    "product-99": "hogar"
  }
}
```

`productCategories` es opcional; si se omite, se usa `category` para todos los
candidatos. El motor pondera las categorías y productos con los que el usuario
interactuó, además de la popularidad observada en los últimos 180 días. Devuelve
los candidatos ordenados por puntaje, junto con el nivel (`high`, `medium` o
`low`) y una explicación. Los productos comprados por el usuario se omiten.
Si aún no hay interacciones, los candidatos se ordenan por popularidad; si no
hay señales disponibles, se devuelven con puntaje bajo.

## Consultar recomendaciones recientes

```http
GET http://localhost:3004/recommendations/user-123
```

Devuelve las cinco recomendaciones guardadas más recientes:

```json
{
  "userId": "user-123",
  "recommendations": []
}
```

La aplicación de origen debe enviar los eventos y los candidatos con sus
categorías a este servicio. Las interacciones se guardan en la colección
`recommendation_events` de MongoDB.

## Ejecución local

Desde esta carpeta:

```powershell
Copy-Item .env.example .env
docker compose up --build
```

La API queda disponible en `http://localhost:3004`; Swagger está en
`http://localhost:3004/api/docs`.
