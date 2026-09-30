import { registerContractCases } from './cases/contract.cases.js';
import { registerUserEdgeCases } from './cases/users-edge.cases.js';
import { registerUserValidationCases } from './cases/users-validation.cases.js';
import 'dotenv/config';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from '@jest/globals';
import bcrypt from 'bcrypt';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { registerAuthCases } from './cases/auth.cases.js';
import { registerTokenCases } from './cases/tokens.cases.js';
import { registerUserCrudCases } from './cases/users-crud.cases.js';
import { registerInvoiceCases } from './cases/invoices.cases.js';

// These checks run before any application module can instantiate a model.
const liveSchema = process.env.DB_SCHEMA;
const testSchema = process.env.DB_TEST_SCHEMA;
if (
  !liveSchema ||
  !testSchema ||
  testSchema === liveSchema ||
  testSchema === 'public'
) {
  throw new Error(
    'Set DB_SCHEMA and a distinct, non-public DB_TEST_SCHEMA before running integration tests.',
  );
}
process.env.DB_USE_TEST_SCHEMA = 'true';

let appServer;
let baseUrl;
let sequelize;
let User;
let Invoice;
let Client;
let Document;
let openApiDocument;
const observedResponses = new Map();
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const responseValidators = new Map();

function documentedRoute(path, method) {
  const pathname = new URL(path, 'http://localhost').pathname;
  const exact = openApiDocument.paths[pathname];
  if (exact) return `${method} ${pathname}`;
  if (/^\/users\/[^/]+\/role$/.test(pathname))
    return `${method} /users/{id}/role`;
  const match = /^\/(users|clients|documents|invoices)\/[^/]+$/.exec(pathname);
  return match ? `${method} /${match[1]}/{id}` : null;
}

function assertOpenApiResponse(route, status, headers, data) {
  const [method, path] = route.split(' ');
  const operation = openApiDocument.paths[path]?.[method.toLowerCase()];
  const documented = operation?.responses[String(status)];
  if (!documented)
    throw new Error(`${route}: HTTP ${status} is not documented in OpenAPI`);

  const media = documented.content?.['application/json'];
  if (!media) {
    expect(data).toBe(null);
    return;
  }
  expect(headers.get('content-type') ?? '').toMatch(
    /^application\/json(?:;|$)/i,
  );
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${route} HTTP ${status}: expected JSON object`);
  }

  const key = `${route} ${status}`;
  if (!responseValidators.has(key)) {
    if (!media.schema) throw new Error(`${key}: missing response schema`);
    responseValidators.set(
      key,
      ajv.compile({
        $ref: media.schema.$ref,
        components: openApiDocument.components,
      }),
    );
  }
  const validate = responseValidators.get(key);
  if (!validate(data)) {
    throw new Error(
      `${key}: ${ajv.errorsText(validate.errors)}; body: ${JSON.stringify(data)}`,
    );
  }
}

const password = 'StrongPass123!';
const userData = (suffix, role = 'regular') => ({
  username: `test_${suffix}`,
  email: `test_${suffix}@example.com`,
  password,
  role,
});

async function request(
  path,
  { method = 'GET', token, body, rawBody, headers = {} } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined || rawBody !== undefined
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...headers,
    },
    body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  const route = documentedRoute(path, method.toUpperCase());
  if (route) {
    if (!observedResponses.has(route)) observedResponses.set(route, new Set());
    observedResponses.get(route).add(response.status);
    assertOpenApiResponse(route, response.status, response.headers, data);
  }
  return { status: response.status, data, headers: response.headers };
}

async function seedUser(suffix, role = 'regular', enabled = true) {
  const data = userData(suffix, role);
  const user = await User.create({
    username: data.username,
    email: data.email,
    passwordHash: await bcrypt.hash(data.password, 4),
    role,
    enabled,
  });
  return { user, data };
}

async function login(data) {
  const response = await request('/auth/login', {
    method: 'POST',
    body: { email: data.email, password: data.password },
  });
  expect(response.status).toBe(200);
  expect(response.data.tokenType).toBe('Bearer');
  expect(response.data.expiresIn).toBe(3600);
  expect(response.data.accessToken).toBeTruthy();
  return response.data.accessToken;
}

async function actor(suffix, role = 'admin') {
  const { user, data } = await seedUser(suffix, role);
  return { user, token: await login(data) };
}

function assertNoPassword(data) {
  expect(JSON.stringify(data)).not.toMatch(/password|StrongPass123!/i);
}

describe('API HTTP con PostgreSQL', () => {
  beforeAll(async () => {
    // Dynamic imports are essential: models choose their schema during import.
    ({ sequelize } = await import('../../src/db/index.js'));
    ({ default: User } = await import('../../src/models/user.js'));
    ({ default: Invoice } = await import('../../src/models/invoice.js'));
    await import('../../src/models/index.js');
    expect(User.getTableName().schema).toBe(testSchema);
    expect(Invoice.getTableName().schema).toBe(testSchema);
    await sequelize.authenticate();
    ({ Client, Document } = await import('../../src/models/index.js'));
    const { initializeDatabase } = await import('../../src/db/index.js');
    await initializeDatabase();
    const [foreignKeys] = await sequelize.query(
      `
      SELECT c.confdeltype
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = :schema AND t.relname = 'invoices' AND c.contype = 'f'
    `,
      { replacements: { schema: testSchema } },
    );
    if (
      !foreignKeys.some(
        ({ confdeltype }) => confdeltype === 'r' || confdeltype === 'a',
      )
    ) {
      throw new Error(
        'invoices.userId must block deleting a user with invoices; existing test-schema constraints may need ON DELETE RESTRICT',
      );
    }
    ({ openApiDocument } = await import('../../src/swagger/index.js'));
    const { default: app } = await import('../../src/app.js');
    appServer = app.listen(0);
    await new Promise((resolve, reject) => {
      appServer.once('listening', resolve);
      appServer.once('error', reject);
    });
    baseUrl = `http://127.0.0.1:${appServer.address().port}`;
  });

  beforeEach(async () => {
    // Only the two qualified tables inside DB_TEST_SCHEMA are cleared.
    const quoted = sequelize.getQueryInterface().quoteIdentifier(testSchema);
    await sequelize.query(
      `TRUNCATE TABLE ${quoted}."invoices", ${quoted}."documents", ${quoted}."clients", ${quoted}."users" RESTART IDENTITY CASCADE`,
    );
  });

  afterAll(async () => {
    if (appServer) await new Promise((resolve) => appServer.close(resolve));
    if (sequelize) await sequelize.close();
  });

  const context = {
    request,
    actor,
    seedUser,
    login,
    userData,
    password,
    assertNoPassword,
    get User() {
      return User;
    },
    get Invoice() {
      return Invoice;
    },
    get Client() {
      return Client;
    },
    get Document() {
      return Document;
    },
  };

  registerAuthCases(context);
  registerUserCrudCases(context);
  registerTokenCases(context);
  registerInvoiceCases(context);
  registerUserValidationCases(context);
  registerUserEdgeCases(context);
  registerContractCases(context);

  test('cada operación documentada tiene al menos un escenario HTTP', () => {
    for (const [path, operations] of Object.entries(openApiDocument.paths)) {
      for (const method of Object.keys(operations)) {
        expect(
          observedResponses.get(`${method.toUpperCase()} ${path}`)?.size ?? 0,
        ).toBeGreaterThan(0);
      }
    }
  });
});
