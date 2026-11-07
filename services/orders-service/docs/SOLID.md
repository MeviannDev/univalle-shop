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
