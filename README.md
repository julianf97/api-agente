# API Agent

API REST de demostración para gestionar usuarios y facturas, desarrollada con Express, PostgreSQL y Sequelize.

Incluye autenticación con JWT, permisos según el rol, documentación interactiva con Swagger, tests automatizados y datos de ejemplo que se cargan al levantar el proyecto con Docker.

El proyecto sirve como base para demostrar cómo un agente de IA podría consultar información y ejecutar acciones sobre una API de gestión. Actualmente implementa la API; la integración del agente corresponde a una siguiente etapa.

## Funcionalidades

- Autenticación mediante correo electrónico y contraseña.
- Administración de usuarios con tres roles: `regular`, `admin` y `superadmin`.
- Creación, consulta, edición y eliminación de facturas según los permisos.
- Listados paginados de usuarios y facturas.
- Contraseñas almacenadas como hashes con bcrypt.
- Validación de entradas y manejo centralizado de errores.
- Documentación OpenAPI disponible en Swagger UI.
- Tests unitarios y de integración con PostgreSQL.
- Ejecución del proyecto mediante Docker Compose.

## Roles y permisos

### Usuarios

| Acción | `regular` | `admin` | `superadmin` |
| --- | --- | --- | --- |
| Listar y consultar usuarios | Sí | Sí | Sí |
| Crear usuarios | No | Solo `regular` | `regular` y `admin` |
| Editar usuarios | No | Solo `regular` | `regular`, `admin` y sus propios datos |
| Eliminar usuarios | No | Solo `regular` | `regular` y `admin` |
| Cambiar roles | No | No | Entre `regular` y `admin` |

Todos los roles pueden consultar usuarios habilitados y deshabilitados.

La cuenta `superadmin` no puede eliminarse, deshabilitarse ni cambiar de rol. Tampoco se pueden crear nuevas cuentas `superadmin` desde la API.

Un usuario con facturas vinculadas no puede eliminarse.

### Facturas

| Acción | `regular` | `admin` | `superadmin` |
| --- | --- | --- | --- |
| Listar y consultar facturas | Solo las propias | Todas | Todas |
| Crear facturas | Solo borradores propios | Para cualquier usuario | Para cualquier usuario |
| Editar facturas | Solo sus propios borradores | Todas | Todas |
| Cambiar propietario o estado | No | Sí | Sí |
| Eliminar facturas | No | Sí | Sí |

Los estados disponibles son:

- `draft`: borrador.
- `issued`: emitida.
- `paid`: pagada.
- `cancelled`: cancelada.

El usuario `regular` puede editar el número, el cliente y el importe de sus propios borradores.

Cuando una factura pasa por primera vez a `issued` o `paid`, la API asigna automáticamente su fecha de emisión.

## Badges

[![CircleCI](https://dl.circleci.com/status-badge/img/gh/julianf97/api-agente/tree/main.svg?style=svg)](https://dl.circleci.com/status-badge/redirect/gh/julianf97/api-agente/tree/main) [![Coverage Status](https://coveralls.io/repos/github/julianf97/api-agente/badge.svg?branch=main)](https://coveralls.io/github/julianf97/api-agente?branch=main)

CircleCI ejecuta los tests automáticamente. GitHub Actions ejecuta la suite con cobertura y publica el reporte en Coveralls.

## Tecnologías

| Tecnología | Uso |
| --- | --- |
| Node.js 22 | Entorno de ejecución en Docker y CI |
| Express | API REST |
| PostgreSQL 15 | Base de datos |
| Sequelize | Modelos y acceso a datos |
| JWT | Autenticación |
| bcrypt | Hash de contraseñas |
| express-validator | Validación de entradas |
| Swagger UI y OpenAPI | Documentación interactiva |
| Jest | Tests unitarios, integración y cobertura |
| Docker Compose | Ejecución de la API y PostgreSQL |
| CircleCI y GitHub Actions | Integración continua |
| Coveralls | Publicación de cobertura |

## Requisitos

Para levantar y probar la API:

- Git.
- Docker con Docker Compose.
- Docker Desktop iniciado, si usás Windows.

No necesitás instalar Node.js ni PostgreSQL en tu computadora para ejecutar la API con Docker.

Para ejecutar los tests localmente, también necesitás Node.js y npm. Se recomienda Node.js 22 para utilizar la misma versión principal que Docker y CI.

## Levantar el proyecto con Docker

### 1. Clonar el repositorio

```sh
git clone https://github.com/julianf97/api-agente.git
cd api-agente
```

### 2. Crear el archivo de configuración

En PowerShell:

```powershell
Copy-Item .env.example .env
```

En Linux o macOS:

```sh
cp .env.example .env
```

Editá `.env` y reemplazá los valores de `DB_PASSWORD` y `JWT_SECRET` por valores propios.

```dotenv
DB_PASSWORD=tu-password-local
JWT_SECRET=tu-secreto-largo-y-aleatorio
```

El archivo `.env` está excluido del control de versiones.

### 3. Construir y levantar los contenedores

```sh
docker compose up -d --build
```

Comprobá su estado:

```sh
docker compose ps
```

### 4. Acceder a la API

| Servicio | Dirección |
| --- | --- |
| API | http://localhost:3000 |
| Swagger | http://localhost:3000/api-docs |
| PostgreSQL desde tu computadora | `localhost:5433` |

Los puertos indicados son los predeterminados. Podés cambiarlos mediante `HOST_PORT` y `DB_HOST_PORT` en `.env`.

### Inicialización y datos de ejemplo

En el primer arranque, con un volumen vacío, PostgreSQL ejecuta:

```text
docker/init/01-seed.sql
```

Este archivo crea las tablas del esquema de demostración y carga **8 usuarios y 100 facturas**.

Antes de iniciar el servidor, la API ejecuta `scripts/bootstrap-db.js` para crear los esquemas que falten y preparar las tablas de desarrollo.

El proyecto utiliza dos esquemas dentro de la misma base de datos:

| Esquema | Propósito |
| --- | --- |
| `api-agente` | Datos de la API y registros de demostración |
| `api-agente-test` | Datos utilizados por los tests de integración |

Los registros se conservan en el volumen `postgres_data`. Reiniciar los contenedores no vuelve a importar el SQL ni restablece los registros modificados.

## Swagger

La documentación interactiva está disponible en:

**http://localhost:3000/api-docs**

Desde Swagger podés consultar:

- Los endpoints disponibles.
- Los campos y validaciones de cada petición.
- Los esquemas de las respuestas.
- Los códigos de estado documentados.
- Los requisitos de autenticación y permisos.

### Probar una ruta protegida

1. Abrí `POST /auth/login`.
2. Pulsá **Try it out**.
3. Ingresá las credenciales de una cuenta de prueba.
4. Pulsá **Execute**.
5. Copiá el token devuelto por la API.
6. Pulsá **Authorize** e ingresá el token JWT.
7. Ejecutá las rutas de usuarios o facturas.

Para probar otro rol, reemplazá el token por el obtenido al iniciar sesión con la cuenta correspondiente.

## Cuentas de prueba

Los datos iniciales incluyen estas cuentas para probar los tres roles:

| Rol | Correo electrónico | Contraseña |
| --- | --- | --- |
| `superadmin` | `admin-user@gmail.com` | `sicorpPassword523` |
| `admin` | `useradmin@example.com` | `useradmin123` |
| `regular` | `postman.regular01@example.com` | `ClaveSegura123` |

Estas credenciales corresponden exclusivamente al entorno de demostración.

Ejemplo de petición para iniciar sesión como `superadmin`:

```json
{
  "email": "admin-user@gmail.com",
  "password": "sicorpPassword523"
}
```

Al editar o eliminar registros, los cambios quedan guardados en el volumen de PostgreSQL.

## Endpoints

### Autenticación

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/auth/login` | Iniciar sesión y obtener un JWT |

### Usuarios

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/users` | Listar usuarios con paginación |
| `POST` | `/users` | Crear un usuario |
| `GET` | `/users/:id` | Consultar un usuario |
| `PATCH` | `/users/:id` | Editar los datos de un usuario |
| `PATCH` | `/users/:id/role` | Cambiar el rol de un usuario |
| `DELETE` | `/users/:id` | Eliminar un usuario |

### Facturas

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/invoices` | Listar las facturas visibles para el usuario |
| `POST` | `/invoices` | Crear una factura |
| `GET` | `/invoices/:id` | Consultar una factura |
| `PATCH` | `/invoices/:id` | Editar una factura |
| `DELETE` | `/invoices/:id` | Eliminar una factura |

Las rutas de usuarios y facturas requieren autenticación:

```http
Authorization: Bearer <token>
```

Los listados admiten `page` y `limit`. Por defecto, se utiliza la página `1` con `20` registros; el límite máximo es `100`.

El importe de una factura debe enviarse como una cadena decimal, por ejemplo `"125.00"`.

Consultá Swagger para ver el contrato completo de cada operación.

## Tests

El proyecto incluye:

- **Tests unitarios:** permisos, reglas de negocio, configuración y manejo de errores.
- **Tests de integración:** peticiones HTTP contra la aplicación y operaciones con PostgreSQL.
- **Comprobaciones del contrato OpenAPI:** validación de respuestas y ejercicio de los códigos documentados.

### Instalar dependencias

Desde la raíz del proyecto:

```sh
npm ci
```

### Ejecutar los tests unitarios

No necesitan PostgreSQL:

```sh
npm run test:unit
```

### Ejecutar todos los tests

Primero levantá los servicios:

```sh
docker compose up -d --build
```

En PowerShell, configurá la conexión al PostgreSQL de Docker:

```powershell
$env:DB_HOST='127.0.0.1'
$env:DB_PORT='5433'
npm test
```

En Linux o macOS:

```sh
DB_HOST=127.0.0.1 DB_PORT=5433 npm test
```

Si modificaste `DB_HOST_PORT`, reemplazá `5433` por el puerto configurado.

### Generar el reporte de cobertura

Después de configurar la conexión a PostgreSQL:

```sh
npm run test:coverage
```

El comando muestra la cobertura en la terminal y genera el reporte en `coverage/`, incluido `coverage/lcov.info`.

Los tests de integración utilizan `api-agente-test` y limpian sus tablas durante la ejecución. No guardes datos que quieras conservar en ese esquema.

### Integración continua

- **CircleCI:** ejecuta los tests con Node.js y PostgreSQL.
- **GitHub Actions:** ejecuta los tests con cobertura y envía el reporte a Coveralls.
- **Coveralls:** muestra la cobertura y su evolución.

## Comandos útiles de Docker

Consultar el estado de los contenedores:

```sh
docker compose ps
```

Ver los logs de la API:

```sh
docker compose logs -f api
```

Ver los logs de PostgreSQL:

```sh
docker compose logs -f db
```

Detener los servicios conservando los datos:

```sh
docker compose down
```

### Restablecer los datos de demostración

Para eliminar los datos actuales y volver a cargar el estado inicial:

```sh
docker compose down -v
docker compose up -d --build
```

> `docker compose down -v` elimina el volumen y todos los registros guardados. El siguiente arranque vuelve a ejecutar el SQL de inicialización.

## Autor

**Julián Finelli**

[GitHub](https://github.com/julianf97)
## Transición a documents, clients e invoices

La rama de facturación requiere migraciones explícitas antes de iniciar la API con la nueva base. Consultá [docs/migrations.md](docs/migrations.md) para preparar los clientes históricos y ejecutar `npm run db:migrate`. No uses `scripts/bootstrap-db.js` para esta transición. Los endpoints y permisos se adaptarán en el siguiente paso.
