# API Agent

API REST de demostración para un sistema de gestión con usuarios y facturas. Está desarrollada con Express, PostgreSQL y Sequelize. Incluye autenticación con JWT, permisos según el rol, documentación interactiva con Swagger y datos de ejemplo para probarla con Docker.

El proyecto sirve como base para explorar cómo un agente de IA podría consultar información y ejecutar acciones sobre una API de gestión. Actualmente implementa la API; no incluye todavía un agente de IA.

## Funcionalidades

- Inicio de sesión mediante `POST /auth/login`.
- Consulta y administración de usuarios.
- Creación, consulta, edición y eliminación de facturas según los permisos del usuario.
- Listados paginados de usuarios y facturas.
- Validación de entradas y respuestas de error documentadas.
- Documentación OpenAPI disponible mediante Swagger UI.

### Roles y permisos

| Rol | Usuarios | Facturas |
| --- | --- | --- |
| `regular` | Puede consultar el listado y los datos de usuarios. | Puede ver sus propias facturas, crear borradores propios y editar sus borradores. No puede eliminar facturas ni cambiar su propietario o estado. |
| `admin` | Puede consultar usuarios y crear, editar o eliminar usuarios `regular`. | Puede consultar todas las facturas y crear, editar o eliminar cualquiera de ellas. |
| `superadmin` | Puede consultar usuarios, crear usuarios `regular` o `admin`, editar y eliminar usuarios de esos roles y cambiar roles entre `regular` y `admin`. Puede editar sus propios datos. | Puede consultar todas las facturas y crear, editar o eliminar cualquiera de ellas. |

La cuenta `superadmin` no puede eliminarse ni asignarse a otro usuario desde la API. Tampoco se puede eliminar un usuario que tenga facturas relacionadas.

## Badges

[![CircleCI](https://dl.circleci.com/status-badge/img/gh/julianf97/api-agente/tree/main.svg?style=svg)](https://dl.circleci.com/status-badge/redirect/gh/julianf97/api-agente/tree/main) [![Coverage Status](https://coveralls.io/repos/github/julianf97/api-agente/badge.svg?branch=main)](https://coveralls.io/github/julianf97/api-agente?branch=main)

CircleCI ejecuta los tests en cada cambio. El badge de Coveralls muestra la cobertura publicada desde GitHub Actions.

## Tecnologías

- Node.js y Express
- PostgreSQL y Sequelize
- JWT y bcrypt
- Swagger UI y OpenAPI
- Jest para tests unitarios y de integración
- Docker Compose
- CircleCI, GitHub Actions y Coveralls

## Levantar el proyecto con Docker

### Requisitos

Solo necesitás Docker con Docker Compose. Para levantar la API de esta manera no hace falta instalar Node.js ni PostgreSQL en tu computadora.

### Pasos

1. Cloná el repositorio y entrá en la carpeta:

   ```sh
   git clone https://github.com/julianf97/api-agente.git
   cd api-agente
   ```

2. Creá el archivo `.env` a partir del ejemplo. En PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   Editá `.env` y reemplazá `DB_PASSWORD` y `JWT_SECRET` por valores propios. No subas `.env` al repositorio.

3. Construí y levantá los contenedores:

   ```sh
   docker compose up -d --build
   docker compose ps
   ```

La API estará disponible en [http://localhost:3000](http://localhost:3000). Si cambiás `HOST_PORT` en `.env`, usá ese puerto en las URLs.

En el **primer arranque con un volumen vacío**, PostgreSQL ejecuta `docker/init/01-seed.sql` para cargar los registros de ejemplo. El arranque de la API ejecuta `scripts/bootstrap-db.js` para preparar los esquemas de desarrollo y tests y las tablas que falten. La base de desarrollo y los tests usan esquemas separados.

El volumen `postgres_data` conserva los datos entre reinicios. Por eso, volver a ejecutar `docker compose up` no vuelve a importar el SQL. Para detener los servicios sin borrar los datos:

```sh
docker compose down
```

> `docker compose down -v` también elimina el volumen y todos los datos guardados. Usalo únicamente si querés volver a probar una instalación desde cero.

## Swagger y prueba de la API

Abrí [http://localhost:3000/api-docs](http://localhost:3000/api-docs) para consultar los endpoints, los cuerpos esperados y las posibles respuestas.

Para probar las rutas protegidas:

1. Ejecutá `POST /auth/login` con las credenciales de una cuenta de prueba.
2. Copiá el token de la respuesta.
3. Pulsá **Authorize** en Swagger e ingresá el token.
4. Probá las rutas de `/users` y `/invoices`.

El archivo SQL contiene cuentas con contraseñas almacenadas como hashes. Para iniciar sesión necesitás conocer la contraseña original de una de esas cuentas; el hash por sí solo no permite obtenerla.

## Endpoints principales

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/auth/login` | Iniciar sesión y obtener un JWT. |
| `GET` | `/users` | Listar usuarios. |
| `POST` | `/users` | Crear un usuario. |
| `GET` | `/users/:id` | Consultar un usuario. |
| `PATCH` | `/users/:id` | Editar un usuario. |
| `PATCH` | `/users/:id/role` | Cambiar el rol de un usuario. |
| `DELETE` | `/users/:id` | Eliminar un usuario. |
| `GET` | `/invoices` | Listar las facturas visibles para el usuario. |
| `POST` | `/invoices` | Crear una factura. |
| `GET` | `/invoices/:id` | Consultar una factura. |
| `PATCH` | `/invoices/:id` | Editar una factura. |
| `DELETE` | `/invoices/:id` | Eliminar una factura. |

La descripción completa de parámetros, permisos y respuestas está en Swagger.

## Tests

Los tests unitarios y de integración se ejecutan en CircleCI. GitHub Actions también ejecuta la suite con cobertura y publica el reporte en Coveralls.

Para ejecutarlos en tu computadora necesitás Node.js y las dependencias del proyecto. Con los contenedores levantados, instalá las dependencias:

```powershell
npm ci
```

En PowerShell, apuntá los tests a PostgreSQL expuesto por Docker y ejecutá la suite:

```powershell
$env:DB_HOST='127.0.0.1'
$env:DB_PORT='5433'
npm test
```

Otros comandos disponibles:

```powershell
npm run test:unit
npm run test:coverage
```

`npm run test:unit` no necesita PostgreSQL. Los tests de integración utilizan el esquema `api-agente-test` y limpian sus tablas durante la ejecución; no guardes datos que quieras conservar en ese esquema.