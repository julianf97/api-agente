# Repository Guide

## Purpose and Stack

This repository is a minimal HTTP API foundation built with Node.js 18+, Express 5, native ES modules, dotenv, and Swagger UI. Its OpenAPI 3.0.3 document is defined inline with the application routes.

## Structure

- `src/app.js` creates and default-exports the Express application. Keep route definitions and the inline OpenAPI document here.
- `src/server.js` loads environment variables, imports the application, resolves the port, and starts the HTTP listener.
- `README.md` documents setup, execution, and public endpoints.
- `.env.example` provides the supported environment-variable template.

Keep application construction separate from process startup. Do not call `listen` from `src/app.js`.

## Code Conventions

- Use native ES module syntax because `package.json` sets `"type": "module"`.
- Use `import` and `export`; do not introduce CommonJS `require` or `module.exports`.
- Include the `.js` extension in local import specifiers, such as `./app.js`.
- Preserve the current small structure and HTTP behavior unless a change explicitly requires otherwise.
- Keep the inline OpenAPI document aligned with every public route change.
- Use `process.env.PORT`, retaining `3000` as the fallback unless requirements change.
- Do not add layers, services, or other modules that the requested change does not need.

## Commands

```sh
npm install
npm run dev
npm start
```

- `npm run dev` starts `nodemon src/server.js` with automatic restarts.
- `npm start` starts `node src/server.js`.
- No automated test or lint script is currently defined in `package.json`. Do not invent one when reporting verification.

## Verification

With the server running on the configured `PORT` (default `3000`):

- `GET /` must return HTTP 200 with `{ "message": "API is running" }`.
- `/api-docs` must serve the Swagger UI for the inline OpenAPI document.
- After changing a route, verify both its runtime response and its OpenAPI entry.

## Boundaries

- Do not edit generated or local tooling metadata under `.atl/` or `.codegraph/`.
- Do not edit installed dependencies under `node_modules/`.
- Do not introduce database, authentication, testing, or business-domain architecture unless explicitly requested.
