# Modelo de facturación de la demo

La API usa cuatro entidades: usuarios, clientes, documentos y facturas. Los únicos roles son `admin` y `regular`.

## Flujo

1. Admin crea el cliente con nombre, identificación fiscal, condición fiscal, país y domicilio.
2. Se crea una orden de venta en `POST /documents`, con `number`, `clientId`, `amount` y, opcionalmente, `isExport`. Empieza como `OV` pendiente.
3. `POST /invoices` recibe únicamente `number` y `documentId`. El servicio bloquea la orden, consulta el cliente, crea la factura y marca la orden `invoiced` dentro de una transacción.
4. La restricción única sobre `documentId` y el bloqueo de la orden evitan facturas duplicadas en ejecuciones concurrentes.

El dueño y el importe de la factura provienen de la orden. Los datos fiscales del cliente se copian a la factura: editar el cliente después no altera el historial. Una factura cancelada no vuelve a habilitar la orden para facturar.

## Reglas de la demo

El emisor se considera responsable inscripto argentino. Una exportación produce E; una venta local a un responsable inscripto o monotributista produce A; a consumidor final o exento produce B. Una venta local requiere un cliente argentino. Son registros de demostración sin autorización fiscal de ARCA.

Admin administra usuarios y clientes y consulta todas las órdenes/facturas. Regular no accede a usuarios ni clientes y solo consulta y opera sus propias órdenes/facturas. Solo admin puede asignar el dueño de una orden y marcar una factura pagada o cancelada.

Las órdenes solo se editan o eliminan mientras están pendientes. Las facturas emitidas conservan origen, importe y datos fiscales; no se eliminan. `DELETE /invoices/:id` devuelve 409 para conservar esa regla y `PATCH` permite cancelar. Los usuarios y clientes relacionados con documentos o facturas no se eliminan.

## Estructura del código

Los módulos siguen el mismo esquema del proyecto: controller, service, repository en la raíz; presentación, preparación de datos y reglas en `support`; validadores en `validators`. Los modelos Sequelize permanecen en `src/models` y Swagger en `src/swagger`. No hay un framework genérico de CRUD.
