# API Agent

A minimal Express API with PostgreSQL persistence through Sequelize and interactive OpenAPI documentation.

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
4. Run `sequelize.sync({ alter: false })`.
5. Start accepting HTTP requests.

The database and schema must already exist. With `alter: false`, Sequelize creates missing tables but does not alter existing ones. Change only the `false` literal in `src/db/index.js` to `true` to enable model-to-table reconciliation for local development. `alter: true` is not a safe production migration strategy.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | Returns the API status message. |
| GET | `/api-docs` | Opens Swagger UI. |

## Integration tests

The integration suite exercises every current HTTP module (`/auth/login` and all `/users` routes), Swagger UI, authentication, validation, role permissions, password hashing, pagination, updates, deletion, and invoice foreign-key protection. There are no invoice HTTP routes yet.

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
