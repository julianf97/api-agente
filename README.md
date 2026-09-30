# API Agent — Demo Sicorp

API REST con Express, PostgreSQL y Sequelize para demostrar automatización de un ERP. Gestiona usuarios, clientes, órdenes de venta y facturas. La integración del agente corresponde a una etapa posterior.

[![CircleCI](https://dl.circleci.com/status-badge/img/gh/julianf97/api-agente/tree/main.svg?style=svg)](https://dl.circleci.com/status-badge/redirect/gh/julianf97/api-agente/tree/main) [![Coverage Status](https://coveralls.io/repos/github/julianf97/api-agente/badge.svg?branch=main)](https://coveralls.io/github/julianf97/api-agente?branch=main)

## Roles

| Operación | admin | regular |
| --- | --- | --- |
| Administrar usuarios | Sí | No |
| Administrar clientes | Sí | Sí |
| Consultar documentos y facturas | Todos | Todos |
| Crear órdenes de venta | Cualquier dueño | Cualquier dueño |
| Editar/eliminar órdenes pendientes | Todas | Todas |
| Facturar una orden pendiente | Todas | Todas |
| Marcar factura pagada o cancelada | Sí | Sí |

Las facturas conservan sus datos fiscales históricos y no se eliminan. Una orden genera una sola factura completa. Consultá [las reglas de facturación](docs/billing-models.md).

## Preparar la base y ejecutar

Se recomienda Node.js 22. Docker Desktop debe estar iniciado en Windows.

```powershell
Copy-Item .env.example .env
npm ci
docker compose up -d db
```

Configurá las credenciales y JWT_SECRET en `.env`. PostgreSQL inicializa la estructura original cuando el volumen es nuevo. Al iniciar el servicio `api`, Docker aplica las migraciones y carga la demo automáticamente. Para una base existente, consultá [las migraciones](docs/migrations.md).

Desde PowerShell, para PostgreSQL de Docker:

```powershell
$env:DB_HOST = '127.0.0.1'
$env:DB_PORT = '5433'
$env:DB_SCHEMA = 'api-agente'
$env:DB_USE_TEST_SCHEMA = 'false'
npm run db:migrate
npm run db:migrate:status
docker compose up -d --build api
```

Una migración aplicada debe figurar en `executed`. Docker Compose aplica automáticamente las migraciones antes de cargar la demo y arrancar la API. PostgreSQL local suele usar el puerto 5432; configurá también las credenciales y DB_NAME correspondientes.

La demo crea cuentas admin y regular. Si ya existen, las reutiliza sin cambiar sus contraseñas; deben estar habilitadas y conservar sus roles. La API no expone registro público.

| Servicio | Dirección predeterminada |
| --- | --- |
| API | http://localhost:3000 |
| Swagger | http://localhost:3000/api-docs |
| PostgreSQL Docker | localhost:5433 |

## Endpoints

Todas las rutas salvo login requieren `Authorization: Bearer <token>`.

| Módulo | Rutas |
| --- | --- |
| Auth | POST /auth/login |
| Users | GET/POST /users; GET/PATCH/DELETE /users/:id; PATCH /users/:id/role |
| Clients | GET/POST /clients; GET/PATCH/DELETE /clients/:id |
| Documents | GET/POST /documents; GET/PATCH/DELETE /documents/:id |
| Invoices | GET/POST /invoices; GET/PATCH /invoices/:id; DELETE devuelve 409 |

Los listados usan `page` y `limit`: valores por defecto 1 y 20, máximo 100 por página. Los importes se envían como texto decimal positivo, por ejemplo `"125.00"`. Swagger documenta los cuerpos y respuestas.

## Tests

Prepará el esquema aislado de tests en la conexión elegida:

```powershell
npm run db:migrate:test:reset
npm run db:migrate:test:status
npm test
npm run test:coverage
```

`db:migrate:test:reset` elimina y recrea solamente DB_TEST_SCHEMA, que debe ser distinto de DB_SCHEMA y terminar en `-test`. Los tests limpian las cuatro tablas de ese esquema. No guardes datos que quieras conservar allí. Los cambios de estructura se aplican mediante migraciones; no se usa sync para actualizar las tablas.

```powershell
npm run test:unit
```

Los unitarios no requieren PostgreSQL. La integración valida respuestas HTTP contra OpenAPI, permisos, referencias, selección A/B/E, snapshots y concurrencia/rollback al facturar. CircleCI y GitHub Actions preparan la base de tests con las mismas migraciones antes de ejecutar la suite.

## Comandos Docker

```powershell
docker compose ps
docker compose logs -f api
docker compose down
```

`down` conserva el volumen. `down -v` elimina toda la base; no es necesario para aplicar migraciones.

## Autor

[Julián Finelli](https://github.com/julianf97)

### Contexto en las consultas de facturación

Todas las respuestas JSON de `/clients`, `/documents` y `/invoices`
(GET, POST, PATCH y DELETE, incluidos errores de validación y negocio) incluyen `context` con `description`, `fields` y `rules`. Explica las
entidades, los campos y las reglas de facturación para consumidores como el agente.
Los datos mantienen su ubicación y los listados conservan `pagination`. El contexto
se incluye una vez por respuesta, también cuando el listado está vacío.

Para facturar, el agente recorre las páginas de documentos, selecciona `type: OV`
y `status: pending`, y envía a `POST /invoices` únicamente `number` y `documentId`.
La API aplica las reglas y evita facturar una orden dos veces. El contexto es
metadata de respuesta: no se envía en POST/PATCH ni requiere migraciones.
Los DELETE exitosos de clientes y documentos devuelven 200 con `message` y
`context` en lugar de 204. DELETE de facturas sigue devolviendo 409 con contexto.

`POST /auth/login` también incluye contexto sobre el token y los permisos.

### Tipos de documento

Se admiten `OV` (orden de venta), `OC` (orden de compra), `PR` (presupuesto),
`RE` (remito) y `NC` (nota de crédito). OV sigue siendo el valor por defecto.
Solo una OV pendiente puede generar una factura. Los otros tipos se almacenan
como documentos de demo, sin procesos contables adicionales.

Después de actualizar el código, ejecutar `npm run db:migrate` contra cada base
(local y Docker, seleccionada mediante las variables DB_HOST y DB_PORT).
Actualizar el schema de tests con `npm run db:migrate:test` en cada base.
La migración conserva los documentos existentes y no carga datos de ejemplo.

### Demo automática con Docker

Con `.env` configurado:

```powershell
docker compose up -d --build
docker compose logs -f api
```

El servicio `api` espera a PostgreSQL, aplica las migraciones, carga la demo y
arranca el servidor. La imagen incluye los archivos de migración. Si falla una
migración o la carga, no inicia la API. Se conserva el volumen existente.

La carga inicial crea cinco clientes y 300 documentos:

| Tipo | Cantidad | Facturable por el agente |
| --- | ---: | --- |
| OV | 150 | Sí, mientras esté pending |
| OC | 38 | No |
| PR | 38 | No |
| RE | 37 | No |
| NC | 37 | No |

Los números comienzan con `DEMO-`. Se asocian al usuario regular y hay clientes
argentinos y extranjeros para probar facturas A, B y E. No se crean facturas:
las genera el agente a través de la API. Los listados son paginados.

| Usuario | Email | Contraseña inicial |
| --- | --- | --- |
| demo_admin | admin@example.com | AdminDemo123! |
| demo_regular | regular@example.com | RegularDemo123! |

Las contraseñas se almacenan hasheadas. Estas cuentas son públicas para la demo.
Reiniciar los contenedores no duplica registros ni modifica documentos ya
facturados o cancelados. Si un documento de demo se elimina, la próxima carga lo
recrea. La carga no modifica cuentas o clientes existentes ni elimina registros.
No se ejecuta en el schema de tests.

### La misma demo en PostgreSQL local

Con `.env` apuntando a PostgreSQL local (`DB_HOST=127.0.0.1`, `DB_PORT=5432`,
`DB_SCHEMA=api-agente` y tus credenciales):

```powershell
npm run db:migrate
npm run db:seed:demo
npm run dev
```

La base local debe tener la estructura original o estar ya migrada. El comando
carga los mismos documentos y puede repetirse. En local, `npm run dev` no carga
la demo automáticamente. Los ids pueden diferir entre bases; se identifican los
documentos por sus números, no por ids fijos. Para tests, aplicar por separado
`npm run db:migrate:test`; el seed de demo nunca se ejecuta sobre tests.
