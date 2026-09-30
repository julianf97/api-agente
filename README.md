# API Agent — Demo Sicorp

API REST con Express, PostgreSQL y Sequelize para demostrar automatización de un agente sobre una API. Gestiona usuarios, clientes, órdenes de venta y facturas. El agente del repositorio [agent-ts-langchain](https://github.com/julianf97/agent-ts-langchain) consume esta API para generar facturas desde órdenes de venta pendientes.

## Badges

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

Cada programador configura su propia contraseña de PostgreSQL y su propio `JWT_SECRET`; no necesita credenciales del autor. Compose crea PostgreSQL y configura la API con las mismas credenciales. Si tenés Node.js instalado, podés generar el secreto con:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Pegá el resultado como `JWT_SECRET` en `.env`. El agente no necesita este secreto: obtiene un token iniciando sesión. No subas `.env` al repositorio.

Para los demás valores podés conservar los de `.env.example`. Dentro de Docker, Compose configura automáticamente `DB_HOST=db`, `DB_PORT=5432` y `DB_SCHEMA=api-agente`. `DB_HOST_PORT=5433` es el puerto de PostgreSQL accesible desde tu computadora; `HOST_PORT=3000` es el puerto público de la API.

### 2. Levantar la demo completa

Antes de ejecutar los comandos, asegurate de que el motor de Docker esté iniciado:

- **Windows o macOS:** abrí Docker Desktop y esperá a que indique que Docker está en ejecución. Mantenelo abierto mientras uses la demo.
- **Linux con Docker Engine:** iniciá el servicio Docker (en distribuciones con systemd, `sudo systemctl start docker`) y asegurate de tener Docker Compose instalado. Si usás Docker Desktop en Linux, abrilo y esperá a que termine de iniciar.

Podés comprobar que el motor está disponible con `docker info`. Si el comando informa que no puede conectarse al daemon de Docker, primero iniciá Docker antes de crear la red o levantar los contenedores.

La API comparte la red externa `erp-agent-network` con el agente. Creala una sola vez antes de levantar los servicios; si ya existe, continuá:

```powershell
docker network create erp-agent-network
docker compose up -d --build
docker compose logs -f api
```

Este comando levanta PostgreSQL y la API. Antes de aceptar solicitudes, el servicio `api` ejecuta automáticamente esta secuencia:

1. Espera a que PostgreSQL esté disponible.
2. Aplica las migraciones para preparar las tablas y relaciones.
3. Carga los usuarios, clientes y documentos de demostración.
4. Inicia el servidor Express.

**No tenés que ejecutar migraciones, SQL ni un seed manualmente.** Levantar solo `db` no ejecuta la carga de demo: esa carga forma parte del arranque de `api`.

Si una migración o el seed falla, el servidor no arranca; revisá los logs.

Con `Ctrl+C` salís de los logs sin detener los contenedores.

### 3. Consultar los registros de PostgreSQL

Después de que la API haya arrancado, salí de los logs con `Ctrl+C`. Desde la carpeta `api-agente`, ejecutá este comando en PowerShell para entrar a PostgreSQL dentro del contenedor:

```powershell
docker compose exec db psql -U postgres -d postgres
```

Si configuraste otro `DB_USER` o `DB_NAME` en `.env`, reemplazá los valores `postgres` del comando por los correspondientes.

Cuando aparezca el prompt `postgres=#`, ya estás dentro de PostgreSQL. Pegá **todo este bloque junto** para ver la cantidad de registros por tabla:

```sql
SELECT 'users' AS tabla, COUNT(*) AS registros FROM "api-agente".users
UNION ALL
SELECT 'clients', COUNT(*) FROM "api-agente".clients
UNION ALL
SELECT 'documents', COUNT(*) FROM "api-agente".documents
UNION ALL
SELECT 'invoices', COUNT(*) FROM "api-agente".invoices;
```

**Las consultas SQL se ejecutan dentro de PostgreSQL, no directamente en PowerShell.** En una base nueva, antes de ejecutar el agente, deberías ver 2 usuarios, 5 clientes, 300 documentos y 0 facturas.

Para ver los registros, ejecutá las siguientes consultas dentro de PostgreSQL:

```sql
SELECT id, username, email, role, enabled FROM "api-agente".users ORDER BY id;
SELECT * FROM "api-agente".clients ORDER BY id;
SELECT * FROM "api-agente".documents ORDER BY id LIMIT 20;
SELECT * FROM "api-agente".invoices ORDER BY id LIMIT 20;
```

Las consultas de documentos y facturas muestran los primeros 20 registros. Quitá `LIMIT 20` para verlos todos. Si el resultado abre un paginador con `(END)`, presioná `q` para volver al prompt.

Para salir de PostgreSQL y volver a PowerShell:

```text
\q
```

### 4. Acceder a la API

| Servicio | Dirección predeterminada |
| --- | --- |
| API | http://localhost:3000 |
| Swagger | http://localhost:3000/api-docs |
| PostgreSQL desde tu computadora | 127.0.0.1:5433 |
| PostgreSQL desde el contenedor API | db:5432 |

La API no expone registro público. Consultá la sección [Swagger](#swagger) para iniciar sesión y probar los endpoints.

## Datos que se cargan automáticamente

En una base nueva, el seed crea los siguientes registros relacionados entre sí:

| Tabla | Datos de demo |
| --- | --- |
| users | 2 usuarios habilitados: admin y regular |
| clients | 5 clientes con datos para probar facturación A, B y E |
| documents | 300 documentos, asociados al usuario regular y a los clientes |
| invoices | Sin facturas iniciales: las crea el agente desde las OV pendientes |

Las tablas quedan preparadas mediante las migraciones. `SequelizeMeta` registra las migraciones aplicadas; no es una tabla de datos de negocio.

| Tipo de documento | Cantidad inicial | Facturable por el agente |
| --- | ---: | --- |
| OV — orden de venta | 150 | Sí, mientras esté pending |
| OC — orden de compra | 38 | No |
| PR — presupuesto | 38 | No |
| RE — remito | 37 | No |
| NC — nota de crédito | 37 | No |

Los documentos se crean con estado `pending` y números como `DEMO-OV-0001`.

Los clientes incluyen casos argentinos y de exportación. Los IDs pueden variar: el agente debe consultar la API para obtenerlos.

| Usuario | Email | Contraseña inicial |
| --- | --- | --- |
| demo_admin | admin@example.com | AdminDemo123! |
| demo_regular | regular@example.com | RegularDemo123! |

Estas credenciales son públicas para la demo; las contraseñas se almacenan hasheadas. Si las cuentas ya existen, el seed las reutiliza sin cambiar sus contraseñas y exige que estén habilitadas y tengan el rol correspondiente.

La carga puede repetirse: no duplica registros, no elimina datos ni restablece órdenes ya facturadas o canceladas. Reutiliza los clientes existentes y recrea los documentos de demo que se hayan eliminado. No se ejecuta en el schema de tests.

En una base existente, la cantidad total puede ser mayor si ya tenía otros datos.

## Conectar el agente

El servicio `api` se conecta a `erp-agent-network` con el alias `api-agente`, además de su red privada para PostgreSQL. El agente dockerizado usa `API_BASE_URL=http://api-agente:3000`; desde tu computadora, usá `http://localhost:3000` (o el `HOST_PORT` configurado). Ambos proyectos deben ejecutarse en el mismo Docker Engine. PostgreSQL conserva su volumen y no se conecta a la red compartida.

Después de actualizar este repositorio, ejecutá `docker compose up -d --build` para conectar el contenedor API a la red.

Con la API levantada, seguí las instrucciones del repositorio [agent-ts-langchain](https://github.com/julianf97/agent-ts-langchain) para configurar y ejecutar el agente.

## Documentación y referencia

Las siguientes secciones describen el uso de la API, los endpoints, los tests y los comandos de mantenimiento.

### Swagger

La documentación interactiva está disponible en [http://localhost:3000/api-docs](http://localhost:3000/api-docs) después de levantar la API. Si cambiás `HOST_PORT`, usá ese puerto en la URL.

Swagger muestra los endpoints, cuerpos de entrada, respuestas y requisitos de autenticación de Auth, Users, Clients, Documents e Invoices.

#### Probar los endpoints

1. Abrí `POST /auth/login`, seleccioná **Try it out** y enviá las credenciales de demo:

   ```json
   {
     "email": "regular@example.com",
     "password": "RegularDemo123!"
   }
   ```

2. Ejecutá la solicitud y copiá el valor de `accessToken`.
3. Seleccioná **Authorize**, pegá solamente el token (sin el prefijo `Bearer`) y confirmá. Swagger agrega automáticamente el encabezado de autorización.
4. Usá **Try it out** para consultar documentos y crear facturas. Para administrar usuarios, iniciá sesión con la cuenta admin.

Para probar la facturación, consultá `GET /documents` y elegí una OV con `status: pending`. En `POST /invoices`, enviá `number` y el `documentId` consultado. La API calcula el resto de los datos y marca la orden como facturada.

Las solicitudes ejecutadas desde Swagger modifican la misma base de la demo que consume el agente.

### Endpoints

Todas las rutas salvo login requieren `Authorization: Bearer <token>`.

| Módulo | Rutas |
| --- | --- |
| Auth | POST /auth/login |
| Users | GET/POST /users; GET/PATCH/DELETE /users/:id; PATCH /users/:id/role |
| Clients | GET/POST /clients; GET/PATCH/DELETE /clients/:id |
| Documents | GET/POST /documents; GET/PATCH/DELETE /documents/:id |
| Invoices | GET/POST /invoices; GET/PATCH /invoices/:id; DELETE devuelve 409 |

Los listados usan `page` y `limit`: valores por defecto 1 y 20, máximo 100 por página. Los importes se envían como texto decimal positivo, por ejemplo `"125.00"`. Swagger documenta los cuerpos y respuestas.

### Tests

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

### Comandos Docker

```powershell
docker compose ps
docker compose logs -f api
docker compose down
```

`down` conserva el volumen. `down -v` elimina toda la base; no es necesario para aplicar migraciones.

### Contexto en las consultas de facturación

Todas las respuestas JSON de `/clients`, `/documents` y `/invoices` (GET, POST, PATCH y DELETE, incluidos errores de validación y negocio) incluyen `context` con `description`, `fields` y `rules`. Explica las entidades, los campos y las reglas de facturación para consumidores como el agente.

Los datos mantienen su ubicación y los listados conservan `pagination`. El contexto se incluye una vez por respuesta, también cuando el listado está vacío.

Para facturar, el agente recorre las páginas de documentos, selecciona `type: OV` y `status: pending`, y envía a `POST /invoices` únicamente `number` y `documentId`.

La API aplica las reglas y evita facturar una orden dos veces. El contexto es metadata de respuesta: no se envía en POST/PATCH ni requiere migraciones.

Los DELETE exitosos de clientes y documentos devuelven 200 con `message` y `context` en lugar de 204. DELETE de facturas sigue devolviendo 409 con contexto.

`POST /auth/login` también incluye contexto sobre el token y los permisos.

### Tipos de documento

Se admiten `OV` (orden de venta), `OC` (orden de compra), `PR` (presupuesto), `RE` (remito) y `NC` (nota de crédito). OV sigue siendo el valor por defecto.

Solo una OV pendiente puede generar una factura. Los otros tipos se almacenan como documentos de demo, sin procesos contables adicionales.

Después de actualizar el código, si ejecutás la demo completa en Docker, usá `docker compose up -d --build`: el arranque de la API aplica las migraciones y ejecuta el seed de demo.

Si ejecutás la API localmente, aplicá las migraciones con `npm run db:migrate` y cargá la demo con `npm run db:seed:demo` cuando corresponda. Para actualizar el schema de tests, usá `npm run db:migrate:test` en la conexión elegida.

Las migraciones conservan los documentos existentes y no cargan datos de ejemplo; esa carga corresponde al seed.
