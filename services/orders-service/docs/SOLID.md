# Aplicación de SOLID en el dominio

- **S — Responsabilidad única:** cada value object valida una regla de valor;
  cada entidad protege las invariantes de su agregado; los puertos solo
  describen una capacidad externa.
- **O — Abierto/cerrado:** las entidades exponen operaciones con intención y
  las dependencias externas se sustituyen por contratos. La infraestructura
  puede añadir adaptadores sin introducir detalles técnicos en el dominio.
- **L — Sustitución de Liskov:** cualquier implementación de un puerto puede
  reemplazar a otra sin cambiar las entidades ni los casos de uso.
- **I — Segregación de interfaces:** los puertos son pequeños y específicos:
  persistencia, reloj, IDs, Usuarios, Catálogo y Pagos están separados.
- **D — Inversión de dependencias:** el dominio depende de interfaces y tokens,
  nunca de NestJS, Mongoose, HTTP o clientes concretos.

## Aplicación

- **S — Responsabilidad única:** cada caso de uso orquesta una sola acción de
  carrito, órdenes o administración; autenticación, paginación y llamadas
  externas se mantienen en colaboradores pequeños.
- **O — Abierto/cerrado:** nuevas políticas pueden incorporarse con puertos o
  casos de uso separados sin añadir dependencias de transporte a los existentes.
- **L — Sustitución de Liskov:** los dobles en memoria y futuros adaptadores
  implementan los mismos contratos de repositorio y servicios.
- **I — Segregación de interfaces:** cada caso de uso recibe solo los puertos
  que necesita; los contratos de Pagos, Catálogo y persistencia permanecen
  separados.
- **D — Inversión de dependencias:** los casos de uso dependen de interfaces
  tipadas del dominio por constructor. El módulo de composición NestJS futuro
  conectará los tokens exportados con adaptadores mediante proveedores.

Los casos de uso no importan NestJS ni infraestructura; esto permite probarlos
con dobles y mantiene el framework fuera de la capa de aplicación.

## Infraestructura y composición

- **S — Responsabilidad única:** los repositorios Mongoose, verificadores JWT,
  clientes HTTP, adaptadores y controladores separan persistencia, seguridad,
  integración y transporte.
- **O — Abierto/cerrado:** los puertos admiten adaptadores `stub` o `http`
  seleccionados por configuración sin cambiar casos de uso.
- **L — Sustitución de Liskov:** ambos adaptadores externos y los repositorios
  cumplen sus puertos para los mismos casos de uso.
- **I — Segregación de interfaces:** los controladores y casos de uso reciben
  solo los contratos que necesitan.
- **D — Inversión de dependencias:** los módulos Nest conectan tokens del
  dominio con adaptadores concretos; la lógica de negocio no importa Mongoose,
  HTTP ni NestJS.
