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

Configurá las credenciales y JWT_SECRET en `.env`. Docker crea únicamente las tablas originales vacías cuando el volumen es nuevo; no carga usuarios ni facturas. Para una base existente, consultá [las migraciones](docs/migrations.md).

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

Una migración aplicada debe figurar en `executed`. Docker no ejecuta automáticamente las migraciones al iniciar la API. PostgreSQL local suele usar el puerto 5432; configurá también las credenciales y DB_NAME correspondientes.

La base vacía requiere crear una cuenta admin con contraseña hasheada antes de iniciar sesión; la API no expone un registro público ni incluye cuentas de prueba automáticas.

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
