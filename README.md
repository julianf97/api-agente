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
