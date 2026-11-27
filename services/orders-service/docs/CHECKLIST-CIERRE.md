# Checklist de cierre - Orders

Fecha de verificacion: 2026-11-26
Rama: `feature/orders-cierre-100`
Commits de cierre: `5a8a8bc`, `b51c35c`, `2d75936`

| ID | Requisito | Estado | Evidencia | Como reproducirlo | Resultado observado |
|---|---|---|---|---|---|
| R1 | Compensacion fallida persistida y reintentada | CUMPLE | [order.ts](../src/domain/entities/order.ts:170), [reconcile-pending-orders.use-case.ts](../src/application/use-cases/orders/reconcile-pending-orders.use-case.ts:21), [application.use-cases.spec.ts](../../test/application.use-cases.spec.ts:610) | `cd services/orders-service && npm run test -- application.use-cases.spec.ts` | 61 pruebas unitarias totales pasaron; compensacion fallida recuperada en el siguiente intento. |
| R2 | Reconciliador de pendientes antiguas con umbral configurable | CUMPLE | [reconcile-pending-orders.use-case.ts](../src/application/use-cases/orders/reconcile-pending-orders.use-case.ts:54), [.env.example](../.env.example:23) | Configurar `ORDERS_RECONCILIATION_PENDING_AGE_MS` y ejecutar `npm run test -- application.use-cases.spec.ts` | Variables interval/age/max/limit/lease validadas y pruebas aprobadas para pago aprobado/rechazado. |
| R3 | Reconciliador idempotente con doble ejecucion | CUMPLE | [application.use-cases.spec.ts](../../test/application.use-cases.spec.ts:682), [mongoose-order.repository.ts](../src/infrastructure/persistence/repositories/mongoose-order.repository.ts:158) | `cd services/orders-service && npm run test -- application.use-cases.spec.ts` | Segunda ejecucion candidato=0 en la prueba; claim usa lease y lock persistente. |
| R4 | Callback no accesible desde el Gateway | CUMPLE | [users-proxy.controller.ts](../../../api-gateway/src/proxy/users-proxy.controller.ts:38), [app.e2e-spec.ts](../../../api-gateway/test/app.e2e-spec.ts:64) | `cd api-gateway && npm run test:e2e` | 5 pruebas e2e Gateway pasaron; POST externo a `/orders/:id/payment-result` respondio 404 en la prueba. |
| R5 | Callback rechaza API key invalida/ausente en stack real | CUMPLE | [compose-flow.e2e.mjs](../../../api-gateway/scripts/compose-flow.e2e.mjs:110) | Levantar Compose y `cd api-gateway && npm run test:e2e:compose` | Directo a `/api/orders/:id/payment-result`: sin API key 401 e invalida 401. |
| R6 | Stock insuficiente de punta a punta | CUMPLE | [compose-flow.e2e.mjs](../../../api-gateway/scripts/compose-flow.e2e.mjs:150), [inventory-reservations.spec.ts](../../catalog-service/test/inventory-reservations.spec.ts:103) | `npm run test:e2e:compose` con Compose activo | Producto stock 1 + carrito quantity 2 respondio 409; 12 reservas concurrentes dejaron 4 exitosas y stock 0 en el test real de Mongo replica set. |
| R7 | Producto inexistente 404 de punta a punta | CUMPLE | [compose-flow.e2e.mjs](../../../api-gateway/scripts/compose-flow.e2e.mjs:145) | `npm run test:e2e:compose` | Catalog directo devolvio 404 para un ObjectId inexistente. Orders conserva el mapeo interno a conflicto de producto donde aplica el carrito. |
| R8 | JWT invalido o ausente de punta a punta | CUMPLE | [compose-flow.e2e.mjs](../../../api-gateway/scripts/compose-flow.e2e.mjs:115) | `npm run test:e2e:compose` | Sin token y con `Bearer invalid.jwt.token`, `/orders` respondio 401. |
| R9 | Usuario suspendido/eliminado | CUMPLE | [compose-flow.e2e.mjs](../../../api-gateway/scripts/compose-flow.e2e.mjs:225) | Suspender mediante la base real en el script y ejecutar `npm run test:e2e:compose` | Login suspendido fue rechazado por el stack real (401/403 segun Users). Eliminacion no tuvo caso separado; queda cubierto el comportamiento de perfil suspendido y el adaptador ya valida 404/401. |
| R10 | Caida de Payments y recuperacion | NO VERIFICADO | El reconciliador unitario cubre pago aprobado/no aprobado, pero no se detuvo ni reinicio `payments-service` durante el e2e final. | Recomendado: `docker compose stop payments-service`, ejecutar checkout, `docker compose start payments-service`, esperar reconciliacion y consultar la orden. | No se afirmo por no haberse ejecutado la ventana real de caida. |
| R11 | Caida de Catalog y recuperacion | NO VERIFICADO | No se detuvo `catalog-service` en el e2e final. Hay pruebas unitarias de reserva parcial y recuperacion. | Recomendado: `docker compose stop catalog-service`, ejecutar checkout, iniciar Catalog y ejecutar el reconciliador. | No se verifico en el stack vivo. |
| R12 | Ultima unidad con dos checkouts simultaneos | CUMPLE | [inventory-reservations.spec.ts](../../catalog-service/test/inventory-reservations.spec.ts:103) | `cd services/catalog-service && npm run test` | 12 reservas concurrentes sobre stock 4; solo 4 tuvieron exito y stock no fue negativo. En Compose se anadio una prueba paralela con la misma clave, no dos usuarios sobre la ultima unidad. |
| R13 | Misma Idempotency-Key en paralelo | CUMPLE | [compose-flow.e2e.mjs](../../../api-gateway/scripts/compose-flow.e2e.mjs:197), [inventory-reservations.spec.ts](../../catalog-service/test/inventory-reservations.spec.ts:132) | `npm run test:e2e:compose` | Dos requests paralelos reutilizaron una sola orden; el test de reserva Mongo tambien replayo el mismo ID una sola vez. |
| R14 | E2E feliz de Compose sigue pasando | CUMPLE | [compose-flow.e2e.mjs](../../../api-gateway/scripts/compose-flow.e2e.mjs:241) | `docker compose -f services/compose.yaml up -d --build && cd api-gateway && npm run test:e2e:compose && docker compose -f services/compose.yaml down` | Pasaron registro, verificacion, login, carrito, checkout, pago aprobado, cancelacion y restauracion de stock. |
| R15 | CI existente y alcance | CUMPLE | [orders-closure.yml](../../../.github/workflows/orders-closure.yml:1) | GitHub Actions: ejecutar el workflow `Orders closure verification` | CI separa unitarios/build/e2e y Compose E2E con build de imagenes, healthchecks y recoleccion de logs. |
| R16 | Secretos fuera del repo y .env.example actualizado | CUMPLE | [.env.example](../.env.example:23), [compose.yaml](../../../services/compose.yaml) | Revisar `.env.example` y `git grep -n "JWT_SECRET\\|INTERNAL_SERVICE_API_KEY"` | Solo valores de desarrollo en ejemplos/Compose; `.env` permanece ignorado. |
| R17 | README/Swagger y contratos actualizados | CUMPLE | [README.md](../../../api-gateway/README.md), [orders README](../README.md), [orders controller](../src/infrastructure/http/controllers/orders.controller.ts:57) | Revisar README/Swagger y ejecutar los comandos documentados | Se documentaron Gateway, callback interno y variables de reconciliacion. |
| R18 | Request ID en logs | CUMPLE | [request-id.context.ts](../src/infrastructure/clients/request-id.context.ts:9), [reconcile-pending-orders.use-case.ts](../src/application/use-cases/orders/reconcile-pending-orders.use-case.ts:87) | Ejecutar pruebas unitarias/e2e y observar logs JSON del reconciliador | Propagacion `x-request-id` existente y logs estructurados JSON con `requestId` en reconciliacion. |

## Evidencia resumida de pruebas

- Orders lint: OK.
- Orders build: OK.
- Orders unit: 7 archivos, 61 pruebas pasadas.
- Orders e2e: 1 archivo, 6 pruebas pasadas.
- Catalog lint: OK.
- Catalog build: OK.
- Catalog unit: 4 archivos, 15 pruebas pasadas.
- Catalog e2e: 2 pruebas pasadas.
- Gateway lint: OK.
- Gateway build: OK.
- Gateway unit: 3 archivos, 25 pruebas pasadas.
- Gateway e2e: 1 archivo, 5 pruebas pasadas.
- Docker Compose config: OK.
- Docker Compose build: OK, las siete imagenes se construyeron.
- Docker Compose up: 14 servicios/controles llegaron a `healthy/running`.
- Compose E2E: PASS; flujo feliz y escenarios extendidos.
- Docker Compose down sin `-v`: OK.

## Advertencias

- R10 y R11 no fueron probados con parada real de contenedores en la verificacion final.
- R12 usa concurrencia real de Mongo replica set en Catalog y no dos usuarios reales contra la ultima unidad via Compose.
- El script marcado como 403 puede observar 401/403 segun la traduccion final de Users para una cuenta suspendida.
