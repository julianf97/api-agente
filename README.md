# API Agent

A minimal Express API with interactive OpenAPI documentation.

## Requirements

- Node.js 18 or newer
- npm

## Setup

Install the dependencies:

```sh
npm install
```

Create a `.env` file from `.env.example` and change the port if needed:

```dotenv
PORT=3000
```

## Run

Start the development server with automatic restarts:

```sh
npm run dev
```

Start the production server:

```sh
npm start
```

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | Returns the API status message. |
| GET | `/api-docs` | Opens Swagger UI. |
