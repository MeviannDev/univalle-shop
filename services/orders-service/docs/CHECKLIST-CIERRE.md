# Checklist de cierre - Orders

Fecha de verificacion: 2026-11-27
Rama: `feature/orders-cierre-100`
Umbral Compose usado en pruebas: intervalo `1000` ms, edad pendiente `15000` ms y lease `10000` ms.

| ID | Requisito | Estado | Evidencia | Como reproducirlo | Resultado observado |
|---|---|---|---|---|---|
| R1 | Compensacion fallida persistida y reintentada | CUMPLE | `services/orders-service/test/application.use-cases.spec.ts:611` | `cd services/orders-service; npm run test` | 62 pruebas pasan; el fallo queda persistido y el siguiente intento recupera la compensacion. |
| R2 | Reconciliador de pendientes antiguas con umbral configurable | CUMPLE | `services/orders-service/src/application/use-cases/orders/reconcile-pending-orders.use-case.ts:54`; `services/orders-service/.env.example:24` | Definir `ORDERS_RECONCILIATION_PENDING_AGE_MS`; `npm run test` | Compose se ejecuto con edad 15000 ms e intervalo 1000 ms. Las pruebas cubren pago aprobado y no aprobado. |
| R3 | Claim de reconciliador idempotente bajo ejecuciones concurrentes | CUMPLE | `services/orders-service/test/mongoose-repositories.spec.ts:88` | `cd services/orders-service; npm run test -- mongoose-repositories.spec.ts` | 6 pruebas pasan contra MongoMemoryReplSet; dos instancias del repositorio reclaman concurrentemente y exactamente una obtiene la orden. No son dos procesos Nest separados. |
| R4 | Callback no accesible desde el Gateway | CUMPLE | `api-gateway/src/proxy/users-proxy.controller.ts:38`; `api-gateway/test/app.e2e-spec.ts:64` | `cd api-gateway; npm run test:e2e` | 5 pruebas e2e pasan; la ruta externa de callback devuelve 404. |
| R5 | Callback rechaza API key invalida o ausente en stack real | CUMPLE | `api-gateway/scripts/compose-flow.e2e.mjs:156` | Con Compose activo: `cd api-gateway; npm run test:e2e:compose` | La llamada directa a Orders devuelve 401 sin clave y con clave incorrecta. |
| R6 | Stock insuficiente de punta a punta | PARCIAL | `api-gateway/scripts/compose-flow.e2e.mjs:205`; `services/catalog-service/test/inventory-reservations.spec.ts` | `npm run test:e2e:compose` y `cd services/catalog-service; npm run test` | Gateway responde 409 al intentar agregar cantidad 2 cuando stock es 1. No llega a checkout porque Orders valida y rechaza el item al agregarlo; no se presenta como checkout completo. |
| R7 | Producto inexistente 404/contrato de error de Orders | CUMPLE | `api-gateway/scripts/compose-flow.e2e.mjs:124` | Con Compose activo: `cd api-gateway; npm run test:e2e:compose` | Checkout por Gateway devuelve 409 `PRODUCT_UNAVAILABLE`; se asertan mensaje, `details`, `timestamp`, `path` y forma completa del cuerpo. El carrito se prepara en Mongo para pasar la validacion previa del endpoint de carrito. |
| R8 | JWT invalido o ausente de punta a punta | CUMPLE | `api-gateway/scripts/compose-flow.e2e.mjs:174` | `npm run test:e2e:compose` | `/orders` devuelve 401 sin token y con `Bearer invalid.jwt.token`. |
| R9 | Usuario suspendido/eliminado | CUMPLE | `api-gateway/scripts/compose-flow.e2e.mjs:289` | `npm run test:e2e:compose` | Se suspende en Mongo el usuario autenticado; el mismo JWT devuelve exactamente 403 `FORBIDDEN` al llamar `/orders`. Users no expone eliminacion de usuarios, por lo que no se probo borrado. |
| R10 | Caida de Payments y recuperacion | CUMPLE | `api-gateway/scripts/compose-flow.e2e.mjs:451` | Configurar variables de reconciliacion como arriba; `npm run test:e2e:compose` | Se detiene `payments-service` durante checkout: 503, orden `PENDING_PAYMENT`, sin `paymentId`, reserva `RESERVED`. Tras `start`, el reconciliador cancela y devuelve el stock a 3. |
| R11 | Caida de Catalog y recuperacion | PARCIAL | `api-gateway/scripts/compose-flow.e2e.mjs:500` | Con Compose activo: `npm run test:e2e:compose` | Se detiene `catalog-service` para el checkout: 503 `DEPENDENCY_UNAVAILABLE`, cero ordenes y cero reservas, stock intacto. Tras `start`, el mismo checkout se reintenta y paga; no hay orden pendiente que reconciliar porque Orders falla en la lectura previa al guardado. |
| R12 | Ultima unidad con dos checkouts simultaneos | CUMPLE | `api-gateway/scripts/compose-flow.e2e.mjs:266` | `npm run test:e2e:compose` | Dos usuarios distintos, Gateway y stock 1: exactamente un 201 y un 409; el stock final es 0, nunca negativo. |
| R13 | Misma Idempotency-Key en paralelo | CUMPLE | `api-gateway/scripts/compose-flow.e2e.mjs:236` | `npm run test:e2e:compose` | Dos solicitudes paralelas devuelven el mismo ID de orden; el estado HTTP admite 200 para replay y 201 para creacion. |
| R14 | E2E feliz de Compose con cancelacion y restauracion | CUMPLE | `api-gateway/scripts/compose-flow.e2e.mjs:35` | `docker compose -f services/compose.yaml up -d --wait; cd api-gateway; npm run test:e2e:compose` | Registro, verificacion, login, carrito, pago aprobado y cancelacion pasan; el stock vuelve de 3 a 5. |
| R15 | CI existente y que ejecuta | NO VERIFICADO | `.github/workflows/orders-closure.yml` | `git push -u origin feature/orders-cierre-100`; abrir PR a `main` y revisar Actions | El workflow local contiene lint/build/tests y Compose E2E. GitHub Actions no reporta ejecucion para esta rama; este cambio no se ha subido y no se afirma que CI pase. |
| R16 | Secretos fuera del repo y `.env.example` actualizado | CUMPLE | `services/orders-service/.env.example:24`; `.gitignore` | `git check-ignore services/orders-service/.env; git ls-files services/orders-service/.env` | `.env` se ignora y no esta versionado; los valores de ejemplo son de desarrollo. |
| R17 | README/Swagger y contratos/comandos de prueba actualizados | CUMPLE | `api-gateway/README.md:59`; `services/orders-service/README.md:50`; `services/orders-service/src/infrastructure/http/controllers/orders.controller.ts:140` | Revisar README y ejecutar `npm run test:e2e:compose` | README documenta escenarios, variables temporales y que Catalog no genera una orden reconciliable si falla en la lectura previa. Swagger documenta el callback interno. |
| R18 | Request ID en logs (opcional) | PARCIAL | `services/orders-service/src/infrastructure/clients/request-id.context.ts:9`; `services/orders-service/src/application/use-cases/orders/reconcile-pending-orders.use-case.ts:90` | Ejecutar Compose y revisar `docker compose logs orders-service` | Los logs estructurados del reconciliador incluyen un `requestId` generado para cada ejecucion. No se verifico en vivo la propagacion de `x-request-id` en todos los logs HTTP. |

## Evidencia resumida de pruebas

- Orders: lint OK; build OK; unitarias 7 archivos / 62 pasadas; e2e 1 archivo / 6 pasadas.
- Catalog: lint OK; build OK; unitarias 4 archivos / 15 pasadas; e2e 1 archivo / 2 pasadas.
- Gateway: lint OK; build OK; unitarias 3 archivos / 25 pasadas; e2e 1 archivo / 5 pasadas.
- Mongo claim/lease: 6 pruebas de `mongoose-repositories.spec.ts` pasadas contra MongoMemoryReplSet; una prueba nueva verifica dos claims concurrentes.
- `docker compose config --quiet`: OK.
- `docker compose build`: OK; construyo las siete imagenes.
- `docker compose up -d --wait`: OK; los 14 servicios/controles quedaron healthy.
- `npm run test:e2e:compose`: PASS; incluye R7, R9, R10, R11 parcial, R12 y R13.
- `docker compose down` sin `-v`: OK; se quitaron contenedores/red y se conservaron los volumenes.

## Cambios de aserciones y limites

- La comprobacion anterior del usuario suspendido aceptaba 401 o 403 y verificaba el login. Se sustituyo por el mismo JWT despues de suspender el usuario, con status exacto 403 y codigo `FORBIDDEN`.
- Las solicitudes idempotentes aceptan 200 o 201 por la diferencia entre replay y creacion, pero ambas deben devolver el mismo ID.
- R6 y R11 quedan parciales por las limitaciones descritas; no se presentan como flujos de reconciliacion completos.
- El workflow no esta verificado en GitHub hasta que se ejecute sobre una rama subida.
