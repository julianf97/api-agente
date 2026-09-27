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
