# API Agent — Demo Sicorp

API REST con Express, PostgreSQL y Sequelize para demostrar automatización de un ERP. Gestiona usuarios, clientes, órdenes de venta y facturas. El agente del repositorio [agent-ts-langchain](https://github.com/julianf97/agent-ts-langchain) consume esta API para generar facturas desde órdenes de venta pendientes.

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

## Inicio rápido con Docker

Necesitás Git y Docker Desktop iniciado (o Docker Engine con Docker Compose).
Para esta opción no necesitás instalar Node.js ni PostgreSQL en tu computadora.

### 1. Clonar y configurar

```powershell
git clone https://github.com/julianf97/api-agente.git
cd api-agente
Copy-Item .env.example .env
```

En Linux o macOS, reemplazá `Copy-Item .env.example .env` por `cp .env.example .env`.
Editá `.env` y reemplazá estos valores antes de arrancar:

```env
DB_PASSWORD=tu_password_de_postgres
JWT_SECRET=tu_secreto_largo_y_aleatorio
```

Cada programador configura su propia contraseña de PostgreSQL y su propio
`JWT_SECRET`; no necesita credenciales del autor. Compose crea PostgreSQL y
configura la API con las mismas credenciales. Si tenés Node.js instalado, podés
generar el secreto con:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Pegá el resultado como `JWT_SECRET` en `.env`. El agente no necesita este secreto:
obtiene un token iniciando sesión. No subas `.env` al repositorio.

Para los demás valores podés conservar los de `.env.example`. Dentro de Docker,
Compose configura automáticamente `DB_HOST=db`, `DB_PORT=5432` y
`DB_SCHEMA=api-agente`. `DB_HOST_PORT=5433` es el puerto de PostgreSQL accesible
desde tu computadora; `HOST_PORT=3000` es el puerto público de la API.

### 2. Levantar la demo completa

```powershell
docker compose up -d --build
docker compose logs -f api
```

Este comando levanta PostgreSQL y la API. Antes de aceptar solicitudes, el servicio
`api` ejecuta automáticamente esta secuencia:

1. Espera a que PostgreSQL esté disponible.
2. Aplica las migraciones para preparar las tablas y relaciones.
3. Carga los usuarios, clientes y documentos de demostración.
4. Inicia el servidor Express.

**No tenés que ejecutar migraciones, SQL ni un seed manualmente.** Levantar solo
`db` no ejecuta la carga de demo: esa carga forma parte del arranque de `api`.
Si una migración o el seed falla, el servidor no arranca; revisá los logs.
Con `Ctrl+C` salís de los logs sin detener los contenedores.

### 3. Acceder a la API

| Servicio | Dirección predeterminada |
| --- | --- |
| API | http://localhost:3000 |
| Swagger | http://localhost:3000/api-docs |
| PostgreSQL desde tu computadora | 127.0.0.1:5433 |
| PostgreSQL desde el contenedor API | db:5432 |

Abrí Swagger y ejecutá `POST /auth/login` con una cuenta de demo. Copiá el
`accessToken` devuelto y usalo en **Authorize** para probar las rutas protegidas.
La API no expone registro público.

## Datos que se cargan automáticamente

En una base nueva, el seed crea los siguientes registros relacionados entre sí:

| Tabla | Datos de demo |
| --- | --- |
| users | 2 usuarios habilitados: admin y regular |
| clients | 5 clientes con datos para probar facturación A, B y E |
| documents | 300 documentos, asociados al usuario regular y a los clientes |
| invoices | Sin facturas iniciales: las crea el agente desde las OV pendientes |

Las tablas quedan preparadas mediante las migraciones. `SequelizeMeta` registra
las migraciones aplicadas; no es una tabla de datos de negocio.

| Tipo de documento | Cantidad inicial | Facturable por el agente |
| --- | ---: | --- |
| OV — orden de venta | 150 | Sí, mientras esté pending |
| OC — orden de compra | 38 | No |
| PR — presupuesto | 38 | No |
| RE — remito | 37 | No |
| NC — nota de crédito | 37 | No |

Los documentos se crean con estado `pending` y números como `DEMO-OV-0001`.
Los clientes incluyen casos argentinos y de exportación. Los IDs pueden variar:
el agente debe consultar la API para obtenerlos.

| Usuario | Email | Contraseña inicial |
| --- | --- | --- |
| demo_admin | admin@example.com | AdminDemo123! |
| demo_regular | regular@example.com | RegularDemo123! |

Estas credenciales son públicas para la demo; las contraseñas se almacenan
hasheadas. Si las cuentas ya existen, el seed las reutiliza sin cambiar sus
contraseñas y exige que estén habilitadas y tengan el rol correspondiente.

La carga puede repetirse: no duplica registros, no elimina datos ni restablece
órdenes ya facturadas o canceladas. Reutiliza los clientes existentes y recrea
los documentos de demo que se hayan eliminado. No se ejecuta en el schema de tests.
En una base existente, la cantidad total puede ser mayor si ya tenía otros datos.

## Conectar el agente

Con la API levantada, configurá en el `.env` de `agent-ts-langchain`:

```env
API_BASE_URL=http://localhost:3000
API_EMAIL=regular@example.com
API_PASSWORD=RegularDemo123!
BILLING_BATCH_SIZE=5
```

Esta URL corresponde al agente ejecutándose en tu computadora con el puerto
predeterminado. Si cambiás `HOST_PORT`, ajustá la URL. Configurá también las
variables de OpenAI indicadas en el repositorio del agente.

El agente inicia sesión, consulta los documentos paginados y selecciona OV con
estado `pending`. Para cada factura envía a `POST /invoices` solamente `number`
y `documentId`. La API calcula los datos fiscales y el importe, crea la factura
y marca la orden como `invoiced`. Una orden admite una única factura.

## API local con PostgreSQL en Docker

Como alternativa para desarrollar, podés ejecutar solamente PostgreSQL en Docker
y la API con Node.js 22 en tu computadora. Después de copiar y configurar `.env`:

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
manuales: `npm run dev` solo inicia la API. No ejecutes simultáneamente otra API
en el mismo puerto. Consultá [las migraciones](docs/migrations.md) para más detalles.

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
