# API Agent

[![Tests](https://github.com/julianf97/api-agente/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/julianf97/api-agente/actions/workflows/tests.yml) [![Coverage Status](https://coveralls.io/repos/github/julianf97/api-agente/badge.svg?branch=main)](https://coveralls.io/github/julianf97/api-agente?branch=main)

A minimal Express API with PostgreSQL persistence through Sequelize and interactive OpenAPI documentation.

## Run with Docker

Docker Compose starts PostgreSQL 15 and the API. Docker is the only prerequisite for this option; no local Node.js or PostgreSQL installation is needed.

Copy `.env.example` to `.env`, replace `DB_PASSWORD` and `JWT_SECRET` with your own values, then run:

```sh
docker compose up --build -d
docker compose ps
```

In PowerShell, use `Copy-Item .env.example .env` to create the file. The API is available at `http://localhost:3000` and Swagger UI at `http://localhost:3000/api-docs`. `HOST_PORT` and `DB_HOST_PORT` in `.env` set the host ports (defaults: 3000 and 5433). The containers communicate on port 5432; Compose overrides `DB_HOST` and `DB_PORT` from `.env` inside the API. Your local PostgreSQL tools can connect to `localhost:5433` using the credentials in `.env`.

On first startup, the API creates the development and test schemas and any missing `users` and `invoices` tables in the development schema. It does not alter existing tables or seed users. PostgreSQL data persists in the `postgres_data` volume. Changing `DB_USER`, `DB_PASSWORD`, or `DB_NAME` in `.env` after the volume has been initialized does not change existing PostgreSQL credentials or database names.

```sh
docker compose logs -f api   # inspect startup
docker compose down          # stop without deleting data
```

To run the integration suite against the Compose database, install Node.js dependencies on your host and use `.env` with `DB_HOST=localhost`, `DB_PORT=5433`, and distinct `DB_SCHEMA` / `DB_TEST_SCHEMA` values; then run `npm test` from the host. The tests clear rows in the test schema. If your host already uses another PostgreSQL instance, point the local variables at the Compose instance before running tests.

## Prerequisites

- Node.js 18 or newer
- npm
- PostgreSQL with the target database and `api-agente` schema already created

## Setup

Install dependencies and create a local environment file:

```sh
npm install
cp .env.example .env
```

Set every database value in `.env` before starting the API. The file is ignored by Git.

| Variable | Purpose |
| --- | --- |
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port |
| `DB_USER` | PostgreSQL user |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_NAME` | Existing PostgreSQL database |
| `DB_SCHEMA` | Existing schema used by the models |
| `PORT` | HTTP port; defaults to `3000` |

## Run

Start the development server with automatic restarts:

```sh
npm run dev
```

Start without automatic restarts:

```sh
npm start
```

## Startup behavior

The API starts in this order:

1. Load the environment and configure the PostgreSQL connection.
2. Register the `User` and `Invoice` models and their associations.
3. Authenticate with PostgreSQL.
4. In test mode only, run `sequelize.sync()` for the test schema. Docker Compose separately initializes missing development tables before starting the API.
5. Start accepting HTTP requests.

For a direct `npm start`, the database, schema and tables must already exist. The Compose bootstrap creates missing schemas and development tables without altering existing ones. Use migrations for changes to existing table structures.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | Returns the API status message. |
| GET | `/api-docs` | Opens Swagger UI. |
| GET | `/invoices` | Lists invoices with pagination; regular users see only their own. |
| POST | `/invoices` | Creates an invoice; regular users can create only their own draft. |
| GET | `/invoices/:id` | Reads an invoice; other users' invoices are hidden from regular users. |
| PATCH | `/invoices/:id` | Edits an invoice; regular users may edit only their own draft's number, customer and amount. |
| DELETE | `/invoices/:id` | Deletes an invoice; admin or superadmin only. |

All invoice routes require a bearer token. Admin and superadmin can read, create, edit and delete every invoice, including assigning its `userId` and changing its `status` (`draft`, `issued`, `paid`, `cancelled`). Regular users cannot delete invoices or change owner or status. An invoice owned by another regular user responds with 404 on read or edit. When an invoice first becomes `issued` or `paid`, the server sets `issuedAt`; clients cannot set it directly. The globally unique `number` produces 409 on collision.

Create with `number`, `customerName` and a positive decimal **string** such as `"125.00"` in `amount`. The amount accepts up to 10 integer digits and two decimal digits; JSON numbers are rejected. Managers may also provide `userId` and `status`. Pagination uses `page` (default 1) and `limit` (default 20, maximum 100). See `/api-docs` for exact request and response schemas.

## Integration tests

The integration suite exercises `/auth/login`, all `/users` and `/invoices` routes, Swagger UI, authentication, validation, role permissions, pagination, updates, deletion, and invoice foreign-key protection.

The HTTP suite is organized under `tests/integration/`. `api.test.js` starts the application, prepares and clears the PostgreSQL test schema, validates response bodies against OpenAPI, and checks that each documented status was observed. The files in `cases/` register the scenarios in this order:

| File | Scenarios |
| --- | --- |
| `auth.cases.js` | Login and basic documentation checks |
| `users-crud.cases.js` | User CRUD flow |
| `tokens.cases.js` | Invalid tokens, login inputs and list boundaries |
| `users-validation.cases.js` | User input and permission matrix |
| `users-edge.cases.js` | Malformed requests, boundaries and disabled actors |
| `invoices.cases.js` | Invoice CRUD, validation, permissions and failures |
| `contract.cases.js` | Authorization changes, pagination and data consistency |

To focus on one area while learning, run `npm test -- --testNamePattern="CRUD de facturas"` (or replace the name with another `describe` heading). Run `npm test` afterward: the global OpenAPI response inventory needs every area to execute.

Create a separate PostgreSQL schema for tests and configure your local `.env`:

```dotenv
DB_SCHEMA=api-agente
DB_TEST_SCHEMA=api-agente-test
JWT_SECRET=your-local-secret
```

Keep the existing `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` pointed at the PostgreSQL instance containing the test schema. Then run:

```sh
npm test
```

The test runner sets `DB_USE_TEST_SCHEMA=true` before importing application modules. It refuses to run if `DB_TEST_SCHEMA` is missing, equals `DB_SCHEMA`, or is `public`. It creates missing model tables with `sync()` and **deletes all rows from the test schema's `users` and `invoices` tables before each test**. Never put data you wish to keep in those test tables. The suite does not start `src/server.js` or use the application's configured port.

### Response coverage

The suite records the HTTP statuses it receives for each OpenAPI operation and fails if any documented response code has no exercised scenario. It also covers representative invalid values for each validated field, ID and pagination boundaries, the role permission matrix, disabled/deleted users, duplicate keys, password hashing, and the invoice deletion restriction. Database failures are deliberately injected at the Sequelize model boundary to exercise the documented 500 response; ordinary success and 4xx cases use the real PostgreSQL test schema. A passing run covers the documented response categories, not every mathematically possible request or every future business rule. Add scenarios whenever routes or documented responses change.

### Test case inventory

| Operation | Success | Validation and boundaries | Authentication and permissions | Missing/conflict/failure |
| --- | --- | --- | --- | --- |
| `POST /auth/login` | Correct credentials, case-normalized email, token contract | Missing/invalid email and password, unexpected fields, malformed JSON | Disabled account | Wrong password, missing account, injected database 500 |
| `GET /users` | Every role, disabled records, default and boundary pagination, empty page, response shape | Invalid page/limit, unexpected query | Missing/malformed/expired token; disabled/deleted actor | Injected database 500 |
| `POST /users` | Admin creates regular; superadmin creates regular/admin; defaults, trimming, hash, max accepted lengths | Missing/wrong-type/empty/overlong fields, UTF-8 password bytes, invalid role, unexpected fields, malformed JSON/content type | Missing/invalid token, disabled actor, forbidden roles | Case-insensitive duplicate email and duplicate username, injected database 500 |
| `GET /users/{id}` | Every role reads an active or disabled account, response shape | Invalid and out-of-range IDs | Missing/invalid token, disabled actor | Missing ID 404, injected database 500 |
| `PATCH /users/{id}` | Permitted actor/target pairs, fields, password hash, enabled toggle, self edit | Invalid ID/body/fields, role in wrong endpoint, malformed JSON/content type | All role combinations, disabled actor, cannot disable superadmin | Missing ID 404, duplicate username/email 409, injected database 500 |
| `PATCH /users/{id}/role` | Promote and demote regular/admin | Invalid ID/role/body, unexpected fields, malformed JSON/content type | Non-superadmin, other superadmin target, disabled actor | Missing ID 404, injected database 500 |
| `DELETE /users/{id}` | Permitted actor/target pairs, no response body | Invalid and out-of-range IDs | Forbidden actor/target pairs, disabled actor | Missing ID 404, invoice relation 409, injected database 500 |
| `GET /invoices` | Own records for regular; all for managers, pagination | Invalid page/limit, unknown query | Missing token | Injected 500 |
| `POST /invoices` | Own draft; manager assigns owner and issued status | Missing/invalid fields, amount precision and range, unknown fields | Missing token, regular cannot assign owner or issued status | Missing owner 404, duplicate number 409, injected 500 |
| `GET /invoices/{id}` | Own and manager read, response contract | Invalid ID | Missing token, another regular user's invoice hidden | Missing/foreign 404, injected 500 |
| `PATCH /invoices/{id}` | Own draft fields, manager changes owner and status | Empty/invalid body, unknown fields, invalid ID | Missing token, another user, own issued draft restrictions | Missing owner/invoice 404, duplicate number 409, injected 500 |
| `DELETE /invoices/{id}` | Admin and superadmin, empty response | Invalid ID | Missing token, regular forbidden | Missing invoice 404, injected 500 |

Run `npm run test:coverage` to see Jest's V8 line and branch coverage and generate `coverage/lcov.info`. A response-code check compares the HTTP statuses exercised by the suite with all statuses declared in OpenAPI. The table is the finite inventory of currently identified input categories and business rules; it must be revised when requirements or routes change.

## Unit tests and error paths

```sh
npm run test:unit      # Pure rules and error handling; PostgreSQL is not needed
npm test               # Unit tests plus HTTP/PostgreSQL integration tests
npm run test:coverage  # Combined line and branch report
```

Unit tests exercise all actor/target/destination role combinations, guard defenses (including an attempted role edit outside its endpoint), password hashing, response projection, real/test model schema selection, database initialization mode, missing JWT configuration, and error mapping. They also test classification of username/email uniqueness conflicts from each Sequelize/PostgreSQL metadata form, the fallback 500 for an unknown unique constraint, and unexpected-error detail shielding. The HTTP suite additionally injects a database failure during bearer authentication and checks its 500 response. The earlier unreachable controller-side 404 checks were removed; `findExistingUserById` throws `UserNotFoundError`, which the central error handler maps to 404.

The suite runs with Jest's ES module support (`--experimental-vm-modules`). Coverage now includes every file in `src/` except the process entry point `server.js`; this may change the percentage compared with Node's previous report, which only counted loaded files.

A coverage percentage measures executed code branches, not completeness of business requirements. The HTTP/PostgreSQL tests require a local test schema and are intentionally not run by `npm run test:unit`.
