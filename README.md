# API Agent â€” Demo Sicorp

API REST con Express, PostgreSQL y Sequelize para demostrar automatizaciÃ³n de un ERP. Gestiona usuarios, clientes, Ã³rdenes de venta y facturas. El agente del repositorio [agent-ts-langchain](https://github.com/julianf97/agent-ts-langchain) consume esta API para generar facturas desde Ã³rdenes de venta pendientes.

[![CircleCI](https://dl.circleci.com/status-badge/img/gh/julianf97/api-agente/tree/main.svg?style=svg)](https://dl.circleci.com/status-badge/redirect/gh/julianf97/api-agente/tree/main) [![Coverage Status](https://coveralls.io/repos/github/julianf97/api-agente/badge.svg?branch=main)](https://coveralls.io/github/julianf97/api-agente?branch=main)

## Roles

| OperaciÃ³n | admin | regular |
| --- | --- | --- |
| Administrar usuarios | SÃ­ | No |
| Administrar clientes | SÃ­ | SÃ­ |
| Consultar documentos y facturas | Todos | Todos |
| Crear Ã³rdenes de venta | Cualquier dueÃ±o | Cualquier dueÃ±o |
| Editar/eliminar Ã³rdenes pendientes | Todas | Todas |
| Facturar una orden pendiente | Todas | Todas |
| Marcar factura pagada o cancelada | SÃ­ | SÃ­ |

Las facturas conservan sus datos fiscales histÃ³ricos y no se eliminan. Una orden genera una sola factura completa. ConsultÃ¡ [las reglas de facturaciÃ³n](docs/billing-models.md).

## Inicio rÃ¡pido con Docker

NecesitÃ¡s Git y Docker Desktop iniciado (o Docker Engine con Docker Compose).
Para esta opciÃ³n no necesitÃ¡s instalar Node.js ni PostgreSQL en tu computadora.

### 1. Clonar y configurar

```powershell
git clone https://github.com/julianf97/api-agente.git
cd api-agente
Copy-Item .env.example .env
```

En Linux o macOS, reemplazÃ¡ `Copy-Item .env.example .env` por `cp .env.example .env`.
EditÃ¡ `.env` y reemplazÃ¡ estos valores antes de arrancar:

```env
DB_PASSWORD=tu_password_de_postgres
JWT_SECRET=tu_secreto_largo_y_aleatorio
```

Para los demÃ¡s valores podÃ©s conservar los de `.env.example`. Dentro de Docker,
Compose configura automÃ¡ticamente `DB_HOST=db`, `DB_PORT=5432` y
`DB_SCHEMA=api-agente`. `DB_HOST_PORT=5433` es el puerto de PostgreSQL accesible
desde tu computadora; `HOST_PORT=3000` es el puerto pÃºblico de la API.

### 2. Levantar la demo completa

```powershell
docker compose up -d --build
docker compose logs -f api
```

Este comando levanta PostgreSQL y la API. Antes de aceptar solicitudes, el servicio
`api` ejecuta automÃ¡ticamente esta secuencia:

1. Espera a que PostgreSQL estÃ© disponible.
2. Aplica las migraciones para preparar las tablas y relaciones.
3. Carga los usuarios, clientes y documentos de demostraciÃ³n.
4. Inicia el servidor Express.

**No tenÃ©s que ejecutar migraciones, SQL ni un seed manualmente.** Levantar solo
`db` no ejecuta la carga de demo: esa carga forma parte del arranque de `api`.
Si una migraciÃ³n o el seed falla, el servidor no arranca; revisÃ¡ los logs.
Con `Ctrl+C` salÃ­s de los logs sin detener los contenedores.

### 3. Acceder a la API

| Servicio | DirecciÃ³n predeterminada |
| --- | --- |
| API | http://localhost:3000 |
| Swagger | http://localhost:3000/api-docs |
| PostgreSQL desde tu computadora | 127.0.0.1:5433 |
| PostgreSQL desde el contenedor API | db:5432 |

AbrÃ­ Swagger y ejecutÃ¡ `POST /auth/login` con una cuenta de demo. CopiÃ¡ el
`accessToken` devuelto y usalo en **Authorize** para probar las rutas protegidas.
La API no expone registro pÃºblico.

## Datos que se cargan automÃ¡ticamente

En una base nueva, el seed crea los siguientes registros relacionados entre sÃ­:

| Tabla | Datos de demo |
| --- | --- |
| users | 2 usuarios habilitados: admin y regular |
| clients | 5 clientes con datos para probar facturaciÃ³n A, B y E |
| documents | 300 documentos, asociados al usuario regular y a los clientes |
| invoices | Sin facturas iniciales: las crea el agente desde las OV pendientes |

Las tablas quedan preparadas mediante las migraciones. `SequelizeMeta` registra
las migraciones aplicadas; no es una tabla de datos de negocio.

| Tipo de documento | Cantidad inicial | Facturable por el agente |
| --- | ---: | --- |
| OV â€” orden de venta | 150 | SÃ­, mientras estÃ© pending |
| OC â€” orden de compra | 38 | No |
| PR â€” presupuesto | 38 | No |
| RE â€” remito | 37 | No |
| NC â€” nota de crÃ©dito | 37 | No |

Los documentos se crean con estado `pending` y nÃºmeros como `DEMO-OV-0001`.
Los clientes incluyen casos argentinos y de exportaciÃ³n. Los IDs pueden variar:
el agente debe consultar la API para obtenerlos.

| Usuario | Email | ContraseÃ±a inicial |
| --- | --- | --- |
| demo_admin | admin@example.com | AdminDemo123! |
| demo_regular | regular@example.com | RegularDemo123! |

Estas credenciales son pÃºblicas para la demo; las contraseÃ±as se almacenan
hasheadas. Si las cuentas ya existen, el seed las reutiliza sin cambiar sus
contraseÃ±as y exige que estÃ©n habilitadas y tengan el rol correspondiente.

La carga puede repetirse: no duplica registros, no elimina datos ni restablece
Ã³rdenes ya facturadas o canceladas. Reutiliza los clientes existentes y recrea
los documentos de demo que se hayan eliminado. No se ejecuta en el schema de tests.
En una base existente, la cantidad total puede ser mayor si ya tenÃ­a otros datos.

## Conectar el agente

Con la API levantada, configurÃ¡ en el `.env` de `agent-ts-langchain`:

```env
API_BASE_URL=http://localhost:3000
API_EMAIL=regular@example.com
API_PASSWORD=RegularDemo123!
BILLING_BATCH_SIZE=5
```

Esta URL corresponde al agente ejecutÃ¡ndose en tu computadora con el puerto
predeterminado. Si cambiÃ¡s `HOST_PORT`, ajustÃ¡ la URL. ConfigurÃ¡ tambiÃ©n las
variables de OpenAI indicadas en el repositorio del agente.

El agente inicia sesiÃ³n, consulta los documentos paginados y selecciona OV con
estado `pending`. Para cada factura envÃ­a a `POST /invoices` solamente `number`
y `documentId`. La API calcula los datos fiscales y el importe, crea la factura
y marca la orden como `invoiced`. Una orden admite una Ãºnica factura.

## API local con PostgreSQL en Docker

Como alternativa para desarrollar, podÃ©s ejecutar solamente PostgreSQL en Docker
y la API con Node.js 22 en tu computadora. DespuÃ©s de copiar y configurar `.env`:

```powershell
npm ci
docker compose up -d --wait db
$env:DB_HOST = '127.0.0.1'
$env:DB_PORT = '5433'
$env:DB_SCHEMA = 'api-agente'
$env:DB_USE_TEST_SCHEMA = 'false'
npm run db:migrate
npm run db:seed:demo
npm run dev
```

El puerto debe coincidir con `DB_HOST_PORT`. Estas variables de PowerShell se
aplican a la terminal actual. En esta modalidad las migraciones y el seed son
manuales: `npm run dev` solo inicia la API. No ejecutes simultÃ¡neamente otra API
en el mismo puerto. ConsultÃ¡ [las migraciones](docs/migrations.md) para mÃ¡s detalles.

## Endpoints

Todas las rutas salvo login requieren `Authorization: Bearer <token>`.

| MÃ³dulo | Rutas |
| --- | --- |
| Auth | POST /auth/login |
| Users | GET/POST /users; GET/PATCH/DELETE /users/:id; PATCH /users/:id/role |
| Clients | GET/POST /clients; GET/PATCH/DELETE /clients/:id |
| Documents | GET/POST /documents; GET/PATCH/DELETE /documents/:id |
| Invoices | GET/POST /invoices; GET/PATCH /invoices/:id; DELETE devuelve 409 |

Los listados usan `page` y `limit`: valores por defecto 1 y 20, mÃ¡ximo 100 por pÃ¡gina. Los importes se envÃ­an como texto decimal positivo, por ejemplo `"125.00"`. Swagger documenta los cuerpos y respuestas.

## Tests

PreparÃ¡ el esquema aislado de tests en la conexiÃ³n elegida:

```powershell
npm run db:migrate:test:reset
npm run db:migrate:test:status
npm test
npm run test:coverage
```

`db:migrate:test:reset` elimina y recrea solamente DB_TEST_SCHEMA, que debe ser distinto de DB_SCHEMA y terminar en `-test`. Los tests limpian las cuatro tablas de ese esquema. No guardes datos que quieras conservar allÃ­. Los cambios de estructura se aplican mediante migraciones; no se usa sync para actualizar las tablas.

```powershell
npm run test:unit
```

Los unitarios no requieren PostgreSQL. La integraciÃ³n valida respuestas HTTP contra OpenAPI, permisos, referencias, selecciÃ³n A/B/E, snapshots y concurrencia/rollback al facturar. CircleCI y GitHub Actions preparan la base de tests con las mismas migraciones antes de ejecutar la suite.

## Comandos Docker

```powershell
docker compose ps
docker compose logs -f api
docker compose down
```

`down` conserva el volumen. `down -v` elimina toda la base; no es necesario para aplicar migraciones.

## Autor

[JuliÃ¡n Finelli](https://github.com/julianf97)

### Contexto en las consultas de facturaciÃ³n

Todas las respuestas JSON de `/clients`, `/documents` y `/invoices`
(GET, POST, PATCH y DELETE, incluidos errores de validaciÃ³n y negocio) incluyen `context` con `description`, `fields` y `rules`. Explica las
entidades, los campos y las reglas de facturaciÃ³n para consumidores como el agente.
Los datos mantienen su ubicaciÃ³n y los listados conservan `pagination`. El contexto
se incluye una vez por respuesta, tambiÃ©n cuando el listado estÃ¡ vacÃ­o.

Para facturar, el agente recorre las pÃ¡ginas de documentos, selecciona `type: OV`
y `status: pending`, y envÃ­a a `POST /invoices` Ãºnicamente `number` y `documentId`.
La API aplica las reglas y evita facturar una orden dos veces. El contexto es
metadata de respuesta: no se envÃ­a en POST/PATCH ni requiere migraciones.
Los DELETE exitosos de clientes y documentos devuelven 200 con `message` y
`context` en lugar de 204. DELETE de facturas sigue devolviendo 409 con contexto.

`POST /auth/login` tambiÃ©n incluye contexto sobre el token y los permisos.

### Tipos de documento

Se admiten `OV` (orden de venta), `OC` (orden de compra), `PR` (presupuesto),
`RE` (remito) y `NC` (nota de crÃ©dito). OV sigue siendo el valor por defecto.
Solo una OV pendiente puede generar una factura. Los otros tipos se almacenan
como documentos de demo, sin procesos contables adicionales.

DespuÃ©s de actualizar el cÃ³digo, ejecutar `npm run db:migrate` contra cada base
(local y Docker, seleccionada mediante las variables DB_HOST y DB_PORT).
Actualizar el schema de tests con `npm run db:migrate:test` en cada base.
La migraciÃ³n conserva los documentos existentes y no carga datos de ejemplo.