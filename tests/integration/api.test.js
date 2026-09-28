import 'dotenv/config';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import bcrypt from 'bcrypt';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// These checks run before any application module can instantiate a model.
const liveSchema = process.env.DB_SCHEMA;
const testSchema = process.env.DB_TEST_SCHEMA;
if (!liveSchema || !testSchema || testSchema === liveSchema || testSchema === 'public') {
  throw new Error('Set DB_SCHEMA and a distinct, non-public DB_TEST_SCHEMA before running integration tests.');
}
process.env.DB_USE_TEST_SCHEMA = 'true';

let appServer;
let baseUrl;
let sequelize;
let User;
let Invoice;
let openApiDocument;
const observedResponses = new Map();
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const responseValidators = new Map();

function documentedRoute(path, method) {
  const pathname = new URL(path, 'http://localhost').pathname;
  if (pathname === '/auth/login') return `${method} /auth/login`;
  if (pathname === '/users') return `${method} /users`;
  if (/^\/users\/[^/]+\/role$/.test(pathname)) return `${method} /users/{id}/role`;
  if (/^\/users\/[^/]+$/.test(pathname)) return `${method} /users/{id}`;
  return null;
}

function assertUserResponse(user) {
  expect(Object.keys(user).sort()).toStrictEqual([
    'id', 'username', 'email', 'role', 'enabled', 'createdAt', 'updatedAt',
  ].sort());
  expect(typeof user.id).toBe('number');
  expect(typeof user.username).toBe('string');
  expect(typeof user.email).toBe('string');
  expect(['regular', 'admin', 'superadmin'].includes(user.role)).toBeTruthy();
  expect(typeof user.enabled).toBe('boolean');
  expect(!Number.isNaN(Date.parse(user.createdAt))).toBeTruthy();
  expect(!Number.isNaN(Date.parse(user.updatedAt))).toBeTruthy();
}

function assertSuccessContract(route, status, data) {
  if (status === 204) {
    expect(data).toBe(null);
  } else if (route === 'POST /auth/login' && status === 200) {
    expect(Object.keys(data).sort()).toStrictEqual(['accessToken', 'expiresIn', 'tokenType']);
  } else if (route === 'GET /users' && status === 200) {
    expect(Object.keys(data).sort()).toStrictEqual(['pagination', 'users']);
    expect(Object.keys(data.pagination).sort()).toStrictEqual(['limit', 'page', 'total', 'totalPages']);
    data.users.forEach(assertUserResponse);
  } else if (route && status >= 200 && status < 300) {
    assertUserResponse(data);
  }
}

function assertOpenApiResponse(route, status, headers, data) {
  const [method, path] = route.split(' ');
  const operation = openApiDocument.paths[path]?.[method.toLowerCase()];
  const documented = operation?.responses[String(status)];
  if (!documented) throw new Error(`${route}: HTTP ${status} is not documented in OpenAPI`);

  const media = documented.content?.['application/json'];
  if (!media) {
    expect(data).toBe(null);
    return;
  }
  expect(headers.get('content-type') ?? '').toMatch(/^application\/json(?:;|$)/i);
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${route} HTTP ${status}: expected JSON object`);
  }

  const key = `${route} ${status}`;
  if (!responseValidators.has(key)) {
    if (!media.schema) throw new Error(`${key}: missing response schema`);
    responseValidators.set(key, ajv.compile({
      $ref: media.schema.$ref,
      components: openApiDocument.components,
    }));
  }
  const validate = responseValidators.get(key);
  if (!validate(data)) {
    throw new Error(`${key}: ${ajv.errorsText(validate.errors)}; body: ${JSON.stringify(data)}`);
  }
}

const password = 'StrongPass123!';
const userData = (suffix, role = 'regular') => ({
  username: `test_${suffix}`,
  email: `test_${suffix}@example.com`,
  password,
  role,
});

async function request(path, { method = 'GET', token, body, rawBody, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined || rawBody !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  const route = documentedRoute(path, method.toUpperCase());
  if (route) {
    if (!observedResponses.has(route)) observedResponses.set(route, new Set());
    observedResponses.get(route).add(response.status);
    assertSuccessContract(route, response.status, data);
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
    method: 'POST', body: { email: data.email, password: data.password },
  });
  expect(response.status).toBe(200);
  expect(response.data.tokenType).toBe('Bearer');
  expect(response.data.expiresIn).toBe(3600);
  expect(response.data.accessToken).toBeTruthy();
  return response.data.accessToken;
}

async function actor(suffix, role = 'superadmin') {
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
    await sequelize.sync();
    const [foreignKeys] = await sequelize.query(`
      SELECT c.confdeltype
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = :schema AND t.relname = 'invoices' AND c.contype = 'f'
    `, { replacements: { schema: testSchema } });
    if (!foreignKeys.some(({ confdeltype }) => confdeltype === 'r' || confdeltype === 'a')) {
      throw new Error('invoices.userId must block deleting a user with invoices; existing test-schema constraints may need ON DELETE RESTRICT');
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
    await sequelize.query(`TRUNCATE TABLE ${quoted}."invoices", ${quoted}."users" RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    if (appServer) await new Promise((resolve) => appServer.close(resolve));
    if (sequelize) await sequelize.close();
  });

  describe('Autenticación y documentación', () => {
    test('Swagger UI is served and login validation rejects malformed input', async () => {
      const docs = await request('/api-docs/');
      expect(docs.status).toBe(200);
      expect(docs.data).toMatch(/swagger-ui/i);
      const missing = await request('/auth/login', { method: 'POST', body: {} });
      expect(missing.status).toBe(400);
      expect(missing.data.errors.some((error) => error.field === 'email')).toBeTruthy();
      const unknown = await request('/auth/login', {
        method: 'POST', body: { email: 'a@example.com', password, extra: true },
      });
      expect(unknown.status).toBe(400);
      const malformed = await request('/auth/login', { method: 'POST', rawBody: '{' });
      expect(malformed.status).toBe(400);
    });

    test('login verifies password, normalizes email and refuses disabled users', async () => {
      const { user, data } = await seedUser('login');
      const token = await login({ ...data, email: data.email.toUpperCase() });
      expect((await request('/users', { token })).status).toBe(200);
      expect((await request('/auth/login', {
        method: 'POST', body: { email: data.email, password: 'wrong' },
      })).status).toBe(401);
      expect((await request('/auth/login', {
        method: 'POST', body: { email: 'missing@example.com', password },
      })).status).toBe(401);
      await user.update({ enabled: false });
      expect((await request('/auth/login', {
        method: 'POST', body: { email: data.email, password },
      })).status).toBe(401);
      expect((await request('/users', { token })).status).toBe(401);
    });

    test('every users route requires a valid active bearer token', async () => {
      const routes = [
        ['/users', 'GET'], ['/users/1', 'GET'], ['/users', 'POST'],
        ['/users/1', 'PATCH'], ['/users/1/role', 'PATCH'], ['/users/1', 'DELETE'],
      ];
      for (const [path, method] of routes) {
        expect((await request(path, { method })).status).toBe(401);
        expect((await request(path, { method, token: 'invalid' })).status).toBe(401);
      }
    });

  });

  describe('CRUD de usuarios', () => {
    test('superadmin creates a user, persists a bcrypt hash, reads and paginates without exposing it', async () => {
      const { token } = await actor('owner');
      const data = userData('created');
      const created = await request('/users', { method: 'POST', token, body: data });
      expect(created.status).toBe(201);
      expect(created.data.email).toBe(data.email);
      assertNoPassword(created.data);
      const row = await User.findByPk(created.data.id);
      expect(row.passwordHash).not.toBe(password);
      expect(await bcrypt.compare(password, row.passwordHash)).toBeTruthy();
      const found = await request(`/users/${row.id}`, { token });
      expect(found.status).toBe(200);
      assertNoPassword(found.data);
      const listed = await request('/users?page=2&limit=1', { token });
      expect(listed.status).toBe(200);
      expect(listed.data.pagination.total).toBe(2);
      expect(listed.data.pagination.page).toBe(2);
      expect(listed.data.users.length).toBe(1);
      assertNoPassword(listed.data);
      expect((await request('/users?page=0', { token })).status).toBe(400);
      expect((await request('/users/0', { token })).status).toBe(400);
      expect((await request('/users/9999', { token })).status).toBe(404);
    });

    test('creation validates fields, rejects duplicates and enforces role hierarchy', async () => {
      const { token: superToken } = await actor('root');
      const { token: adminToken } = await actor('admin', 'admin');
      const { token: regularToken } = await actor('reader', 'regular');
      const data = userData('new');
      expect((await request('/users', { method: 'POST', token: regularToken, body: data })).status).toBe(403);
      expect((await request('/users', {
        method: 'POST', token: adminToken, body: { ...data, role: 'admin' },
      })).status).toBe(403);
      expect((await request('/users', {
        method: 'POST', token: superToken, body: { ...data, role: 'superadmin' },
      })).status).toBe(400);
      expect((await request('/users', {
        method: 'POST', token: adminToken, body: { ...data, extra: true },
      })).status).toBe(400);
      expect((await request('/users', {
        method: 'POST', token: adminToken, body: { ...data, password: ' '.repeat(4) },
      })).status).toBe(400);
      expect((await request('/users', { method: 'POST', token: adminToken, body: data })).status).toBe(201);
      expect((await request('/users', {
        method: 'POST', token: adminToken, body: { ...data, email: 'different@example.com' },
      })).status).toBe(409);
      expect((await request('/users', {
        method: 'POST', token: adminToken, body: { ...data, username: 'different' },
      })).status).toBe(409);
    });

    test('update changes fields and password; role changes use the dedicated superadmin route', async () => {
      const { token } = await actor('root');
      const { user, data } = await seedUser('target');
      const updated = await request(`/users/${user.id}`, {
        method: 'PATCH', token,
        body: { username: 'renamed', email: 'RENAMED@example.com', password: 'NewPassword123!' },
      });
      expect(updated.status).toBe(200);
      expect(updated.data.email).toBe('renamed@example.com');
      assertNoPassword(updated.data);
      await user.reload();
      expect(await bcrypt.compare('NewPassword123!', user.passwordHash)).toBeTruthy();
      expect((await request('/auth/login', {
        method: 'POST', body: { email: data.email, password },
      })).status).toBe(401);
      expect((await request('/users/99999', {
        method: 'PATCH', token, body: { username: 'absent' },
      })).status).toBe(404);
      expect((await request(`/users/${user.id}`, {
        method: 'PATCH', token, body: { role: 'admin' },
      })).status).toBe(400);
      expect((await request(`/users/${user.id}`, {
        method: 'PATCH', token, body: {},
      })).status).toBe(400);
      const promoted = await request(`/users/${user.id}/role`, {
        method: 'PATCH', token, body: { role: 'admin' },
      });
      expect(promoted.status).toBe(200);
      expect(promoted.data.role).toBe('admin');
      expect((await request(`/users/${user.id}/role`, {
        method: 'PATCH', token, body: { role: 'superadmin' },
      })).status).toBe(400);
    });

    test('regular users cannot mutate; admin cannot edit admin; superadmin cannot be disabled or deleted', async () => {
      const { user: root, token: superToken } = await actor('root');
      const { user: admin, token: adminToken } = await actor('admin', 'admin');
      const { user: regular, token: regularToken } = await actor('regular', 'regular');
      expect((await request(`/users/${regular.id}`, {
        method: 'PATCH', token: regularToken, body: { username: 'bad' },
      })).status).toBe(403);
      expect((await request(`/users/${admin.id}`, {
        method: 'PATCH', token: adminToken, body: { username: 'bad' },
      })).status).toBe(403);
      expect((await request(`/users/${regular.id}/role`, {
        method: 'PATCH', token: adminToken, body: { role: 'admin' },
      })).status).toBe(403);
      expect((await request(`/users/${root.id}`, {
        method: 'PATCH', token: superToken, body: { enabled: false },
      })).status).toBe(403);
      expect((await request(`/users/${root.id}`, {
        method: 'DELETE', token: superToken,
      })).status).toBe(403);
    });

    test('delete removes a user and refuses one with related invoices', async () => {
      const { token } = await actor('root');
      const { user } = await seedUser('removable');
      expect((await request(`/users/${user.id}`, { method: 'DELETE', token })).status).toBe(204);
      expect(await User.findByPk(user.id)).toBe(null);
      expect((await request(`/users/${user.id}`, { method: 'DELETE', token })).status).toBe(404);
      const { user: billed } = await seedUser('billed');
      await Invoice.create({
        number: 'TEST-001', userId: billed.id, customerName: 'Empresa Prueba SA',
        amount: '125.00', status: 'issued',
      });
      const blocked = await request(`/users/${billed.id}`, { method: 'DELETE', token });
      expect(blocked.status).toBe(409);
      expect(await User.findByPk(billed.id)).toBeTruthy();
    });

  });

  describe('Validación y tokens', () => {
    test('login validates each field and rejects unexpected input without leaking passwords', async () => {
      const cases = [
        [{ password }, 'email'],
        [{ email: 'test@example.com' }, 'password'],
        [{ email: 42, password }, 'email'],
        [{ email: 'invalid', password }, 'email'],
        [{ email: '', password }, 'email'],
        [{ email: 'test@example.com', password: 42 }, 'password'],
        [{ email: 'test@example.com', password: '' }, 'password'],
        [{ email: 'test@example.com', password, extra: 'x' }, 'extra'],
      ];
      for (const [body, field] of cases) {
        const response = await request('/auth/login', { method: 'POST', body });
        expect(response.status).toBe(400);
        if (!response.data.errors.some((error) => error.field === field)) {
          throw new Error(`Missing validation error for ${field}: ${JSON.stringify(response.data)}`);
        }
        expect(JSON.stringify(response.data)).not.toMatch(/StrongPass123!/);
      }
    });

    test('tokens reject malformed, expired, wrong signature and deleted account', async () => {
      const jwt = (await import('jsonwebtoken')).default;
      const { user, token } = await actor('auth');
      const cases = [
        { headers: { Authorization: `Basic ${token}` } },
        { token: 'malformed.token' },
        { token: jwt.sign({ role: 'superadmin' }, 'wrong-secret', { subject: String(user.id) }) },
        { token: jwt.sign({ role: 'superadmin' }, process.env.JWT_SECRET, { subject: String(user.id), expiresIn: -1 }) },
        { token: jwt.sign({ role: 'superadmin' }, process.env.JWT_SECRET, { subject: 'invalid' }) },
      ];
      for (const options of cases) {
        expect((await request('/users', options)).status).toBe(401);
      }
      await user.destroy();
      expect((await request('/users', { token })).status).toBe(401);
    });

    test('list includes disabled users, supports default and boundary pagination, rejects invalid query', async () => {
      const { token } = await actor('reader', 'regular');
      const { user: disabled } = await seedUser('disabled', 'regular', false);
      const defaults = await request('/users', { token });
      expect(defaults.status).toBe(200);
      expect(defaults.data.pagination.page).toBe(1);
      expect(defaults.data.pagination.limit).toBe(20);
      expect(defaults.data.users.some((user) => user.id === disabled.id && user.enabled === false)).toBeTruthy();
      for (const query of ['page=1&limit=100', 'page=100&limit=1']) {
        const response = await request(`/users?${query}`, { token });
        expect(response.status).toBe(200);
        assertNoPassword(response.data);
      }
      const empty = await request('/users?page=100&limit=1', { token });
      expect(empty.data.users).toStrictEqual([]);
      for (const query of ['page=0', 'page=-1', 'page=foo', 'limit=0', 'limit=101', 'limit=foo', 'extra=1']) {
        const response = await request(`/users?${query}`, { token });
        expect(response.status).toBe(400);
      }
    });

  });

  describe('Entradas y permisos de usuarios', () => {
    test('read by ID allows every role and handles missing, malformed and out-of-range IDs', async () => {
      const { token: regular } = await actor('regular', 'regular');
      const { token: admin } = await actor('admin', 'admin');
      const { token: superadmin } = await actor('superadmin');
      const { user: target } = await seedUser('target', 'regular', false);
      for (const token of [regular, admin, superadmin]) {
        const response = await request(`/users/${target.id}`, { token });
        expect(response.status).toBe(200);
        expect(response.data.enabled).toBe(false);
        assertNoPassword(response.data);
      }
      for (const id of ['0', '-1', 'abc', '2147483648']) {
        expect((await request(`/users/${id}`, { token: regular })).status).toBe(400);
      }
      expect((await request('/users/999999', { token: regular })).status).toBe(404);
    });

    test('create accepts default role and allowed roles, trims username and normalizes email', async () => {
      const { token: admin } = await actor('admin', 'admin');
      const { token: superadmin } = await actor('superadmin');
      const first = await request('/users', {
        method: 'POST', token: admin,
        body: { username: '  trimmed  ', email: 'UPPER@example.com', password },
      });
      expect(first.status).toBe(201);
      expect(first.data.username).toBe('trimmed');
      expect(first.data.email).toBe('upper@example.com');
      expect(first.data.role).toBe('regular');
      expect(first.data.enabled).toBe(true);
      const second = await request('/users', {
        method: 'POST', token: superadmin,
        body: userData('new_admin', 'admin'),
      });
      expect(second.status).toBe(201);
      expect(second.data.role).toBe('admin');
      assertNoPassword(second.data);
    });

    test('create rejects every required-field, type, length, role and unknown-field category', async () => {
      const { token } = await actor('root');
      const valid = userData('candidate');
      const invalid = [
        [{ ...valid, username: undefined }, 'username'],
        [{ ...valid, username: 42 }, 'username'],
        [{ ...valid, username: '   ' }, 'username'],
        [{ ...valid, username: 'a'.repeat(256) }, 'username'],
        [{ ...valid, email: undefined }, 'email'],
        [{ ...valid, email: 42 }, 'email'],
        [{ ...valid, email: 'invalid' }, 'email'],
        [{ ...valid, email: 'a'.repeat(250) + '@x.com' }, 'email'],
        [{ ...valid, password: undefined }, 'password'],
        [{ ...valid, password: 42 }, 'password'],
        [{ ...valid, password: '    ' }, 'password'],
        [{ ...valid, password: 'é'.repeat(37) }, 'password'],
        [{ ...valid, role: 42 }, 'role'],
        [{ ...valid, role: 'superadmin' }, 'role'],
        [{ ...valid, unexpected: true }, 'unexpected'],
      ];
      for (const [body, field] of invalid) {
        const result = await request('/users', { method: 'POST', token, body });
        expect(result.status).toBe(400);
        if (!result.data.errors.some((error) => error.field === field)) {
          throw new Error(`Missing validation error for ${field}: ${JSON.stringify(result.data)}`);
        }
      }
      expect(await User.count()).toBe(1);
    });

    test('update validates ID, body fields and conflicts without modifying the target', async () => {
      const { token } = await actor('root');
      const { user } = await seedUser('target');
      const { user: existing } = await seedUser('existing');
      for (const id of ['0', '-1', 'abc', '2147483648']) {
        expect((await request(`/users/${id}`, { method: 'PATCH', token, body: { enabled: false } })).status).toBe(400);
      }
      const invalid = [
        [{}, 'body'],
        [{ username: 42 }, 'username'],
        [{ username: '  ' }, 'username'],
        [{ username: 'a'.repeat(256) }, 'username'],
        [{ email: 42 }, 'email'],
        [{ email: 'broken' }, 'email'],
        [{ email: 'a'.repeat(250) + '@x.com' }, 'email'],
        [{ password: 42 }, 'password'],
        [{ password: '  ' }, 'password'],
        [{ password: 'é'.repeat(37) }, 'password'],
        [{ enabled: 'yes' }, 'enabled'],
        [{ role: 'admin' }, 'role'],
        [{ extra: true }, 'extra'],
      ];
      for (const [body] of invalid) {
        const result = await request(`/users/${user.id}`, { method: 'PATCH', token, body });
        expect(result.status).toBe(400);
      }
      for (const body of [{ username: existing.username }, { email: existing.email }]) {
        expect((await request(`/users/${user.id}`, { method: 'PATCH', token, body })).status).toBe(409);
      }
      await user.reload();
      expect(user.username).toBe('test_target');
      expect(user.email).toBe('test_target@example.com');
      expect(user.enabled).toBe(true);
      expect((await request('/users/99999', { method: 'PATCH', token, body: { enabled: false } })).status).toBe(404);
    });

    test('update permission matrix and enabled toggle', async () => {
      const { user: root, token: superadmin } = await actor('root');
      const { user: adminUser, token: admin } = await actor('admin', 'admin');
      const { user: regularUser, token: regular } = await actor('regular', 'regular');
      const allowed = await request(`/users/${regularUser.id}`, { method: 'PATCH', token: admin, body: { enabled: false } });
      expect(allowed.status).toBe(200);
      expect(allowed.data.enabled).toBe(false);
      expect((await request('/auth/login', {
        method: 'POST', body: { email: 'test_regular@example.com', password },
      })).status).toBe(401);
      expect((await request(`/users/${regularUser.id}`, { method: 'PATCH', token: admin, body: { enabled: true } })).status).toBe(200);
      expect((await request(`/users/${adminUser.id}`, { method: 'PATCH', token: superadmin, body: { username: 'edited_admin' } })).status).toBe(200);
      expect((await request(`/users/${root.id}`, { method: 'PATCH', token: superadmin, body: { username: 'edited_root' } })).status).toBe(200);
      expect((await request(`/users/${adminUser.id}`, { method: 'PATCH', token: admin, body: { username: 'forbidden' } })).status).toBe(403);
      expect((await request(`/users/${root.id}`, { method: 'PATCH', token: admin, body: { username: 'forbidden' } })).status).toBe(403);
      expect((await request(`/users/${regularUser.id}`, { method: 'PATCH', token: regular, body: { username: 'forbidden' } })).status).toBe(403);
      expect((await request(`/users/${root.id}`, { method: 'PATCH', token: superadmin, body: { enabled: false } })).status).toBe(403);
    });

    test('role endpoint validates ID and body and covers promotion, demotion and permissions', async () => {
      const { user: root, token: superadmin } = await actor('root');
      const { user: adminUser, token: admin } = await actor('admin', 'admin');
      const { user: regularUser, token: regular } = await actor('regular', 'regular');
      for (const id of ['0', '-1', 'abc', '2147483648']) {
        expect((await request(`/users/${id}/role`, { method: 'PATCH', token: superadmin, body: { role: 'admin' } })).status).toBe(400);
      }
      for (const body of [{}, { role: 'superadmin' }, { role: 42 }, { role: 'admin', extra: true }]) {
        expect((await request(`/users/${regularUser.id}/role`, { method: 'PATCH', token: superadmin, body })).status).toBe(400);
      }
      expect((await request('/users/99999/role', { method: 'PATCH', token: superadmin, body: { role: 'admin' } })).status).toBe(404);
      expect((await request(`/users/${regularUser.id}/role`, { method: 'PATCH', token: admin, body: { role: 'admin' } })).status).toBe(403);
      expect((await request(`/users/${regularUser.id}/role`, { method: 'PATCH', token: regular, body: { role: 'admin' } })).status).toBe(403);
      expect((await request(`/users/${root.id}/role`, { method: 'PATCH', token: superadmin, body: { role: 'admin' } })).status).toBe(403);
      const promoted = await request(`/users/${regularUser.id}/role`, { method: 'PATCH', token: superadmin, body: { role: 'admin' } });
      expect(promoted.status).toBe(200);
      expect(promoted.data.role).toBe('admin');
      const demoted = await request(`/users/${adminUser.id}/role`, { method: 'PATCH', token: superadmin, body: { role: 'regular' } });
      expect(demoted.status).toBe(200);
      expect(demoted.data.role).toBe('regular');
    });

    test('delete validates IDs and covers admin/superadmin permission matrix', async () => {
      const { user: root, token: superadmin } = await actor('root');
      const { user: adminUser, token: admin } = await actor('admin', 'admin');
      const { user: regularUser, token: regular } = await actor('regular', 'regular');
      for (const id of ['0', '-1', 'abc', '2147483648']) {
        expect((await request(`/users/${id}`, { method: 'DELETE', token: superadmin })).status).toBe(400);
      }
      expect((await request('/users/99999', { method: 'DELETE', token: superadmin })).status).toBe(404);
      expect((await request(`/users/${regularUser.id}`, { method: 'DELETE', token: regular })).status).toBe(403);
      expect((await request(`/users/${adminUser.id}`, { method: 'DELETE', token: admin })).status).toBe(403);
      expect((await request(`/users/${root.id}`, { method: 'DELETE', token: superadmin })).status).toBe(403);
      expect((await request(`/users/${regularUser.id}`, { method: 'DELETE', token: admin })).status).toBe(204);
      expect((await request(`/users/${adminUser.id}`, { method: 'DELETE', token: superadmin })).status).toBe(204);
    });

    test('unexpected persistence failures return documented 500 on every endpoint', async () => {
      const originalError = console.error;
      console.error = () => {};
      try {
        async function fails(model, method, path, options) {
          const original = model[method];
          model[method] = async () => { throw new Error('Simulated database failure'); };
          try {
            const result = await request(path, options);
            expect(result.status).toBe(500);
            expect(result.data).toStrictEqual({ error: 'Error interno del servidor.' });
          } finally {
            model[method] = original;
          }
        }
        await fails(User, 'findOne', '/auth/login', { method: 'POST', body: { email: 'x@example.com', password } });
        const { token } = await actor('root');
        await fails(User, 'findAndCountAll', '/users', { token });
        await fails(User, 'create', '/users', { method: 'POST', token, body: userData('failure') });
        const originalFind = User.findByPk;
        User.findByPk = async (id, ...args) => {
          if (String(id) === '99999') throw new Error('Simulated database failure');
          return originalFind.call(User, id, ...args);
        };
        try {
          const cases = [
            ['/users/99999', { token }],
            ['/users/99999', { method: 'PATCH', token, body: { enabled: false } }],
            ['/users/99999/role', { method: 'PATCH', token, body: { role: 'admin' } }],
            ['/users/99999', { method: 'DELETE', token }],
          ];
          for (const [path, options] of cases) {
            const result = await request(path, options);
            expect(result.status).toBe(500);
            expect(result.data).toStrictEqual({ error: 'Error interno del servidor.' });
          }
        } finally {
          User.findByPk = originalFind;
        }
      } finally {
        console.error = originalError;
      }
    });



  });

  describe('Errores y casos límite', () => {
    test('every write route handles malformed JSON, unknown properties and invalid content types', async () => {
      const { user, token } = await actor('root');
      const routes = [
        ['/users', userData('input')],
        [`/users/${user.id}`, { username: 'changed' }],
        [`/users/${user.id}/role`, { role: 'admin' }],
      ];
      for (const [path, validBody] of routes) {
        const malformed = await request(path, { method: path === '/users' ? 'POST' : 'PATCH', token, rawBody: '{' });
        expect(malformed.status).toBe(400);
        expect(malformed.data.errors.some((error) => error.field === 'body')).toBeTruthy();
        const unknown = await request(path, {
          method: path === '/users' ? 'POST' : 'PATCH', token,
          body: { ...validBody, unexpected: 'ignored?' },
        });
        expect(unknown.status).toBe(400);
        expect(unknown.data.errors.some((error) => error.field === 'unexpected')).toBeTruthy();
        const wrongType = await request(path, {
          method: path === '/users' ? 'POST' : 'PATCH', token,
          rawBody: JSON.stringify(validBody), headers: { 'Content-Type': 'text/plain' },
        });
        expect(wrongType.status).toBe(400);
      }
    });

    test('user creation and update exercise accepted boundaries and case-insensitive email uniqueness', async () => {
      const { token } = await actor('root');
      const maxPassword = 'a'.repeat(72);
      const maxUsername = 'u'.repeat(255);
      const created = await request('/users', {
        method: 'POST', token,
        body: { username: maxUsername, email: 'boundary@example.com', password: maxPassword },
      });
      expect(created.status).toBe(201);
      expect(created.data.username.length).toBe(255);
      expect(await bcrypt.compare(maxPassword, (await User.findByPk(created.data.id)).passwordHash)).toBeTruthy();
      const sameEmail = await request('/users', {
        method: 'POST', token, body: { ...userData('duplicate'), email: 'BOUNDARY@example.com' },
      });
      expect(sameEmail.status).toBe(409);
      const updated = await request(`/users/${created.data.id}`, {
        method: 'PATCH', token, body: { password: maxPassword, username: 'u'.repeat(255) },
      });
      expect(updated.status).toBe(200);
      expect(updated.data.username.length).toBe(255);
    });

    test('mutating routes enforce every actor-target role combination', async () => {
      const { user: root, token: superadmin } = await actor('root');
      const { user: anotherRoot } = await seedUser('another_root', 'superadmin');
      const { user: adminUser, token: admin } = await actor('admin', 'admin');
      const { user: regularUser, token: regular } = await actor('regular', 'regular');
      const attempts = [
        // regular cannot create, edit, change roles or delete any account.
        ['/users', { method: 'POST', token: regular, body: userData('denied') }],
        [`/users/${regularUser.id}`, { method: 'PATCH', token: regular, body: { username: 'denied' } }],
        [`/users/${regularUser.id}/role`, { method: 'PATCH', token: regular, body: { role: 'admin' } }],
        [`/users/${regularUser.id}`, { method: 'DELETE', token: regular }],
        // admin cannot create admin, edit or delete admin/superadmin, or change roles.
        ['/users', { method: 'POST', token: admin, body: userData('denied_admin', 'admin') }],
        [`/users/${adminUser.id}`, { method: 'PATCH', token: admin, body: { username: 'denied' } }],
        [`/users/${root.id}`, { method: 'PATCH', token: admin, body: { username: 'denied' } }],
        [`/users/${adminUser.id}`, { method: 'DELETE', token: admin }],
        [`/users/${root.id}`, { method: 'DELETE', token: admin }],
        [`/users/${regularUser.id}/role`, { method: 'PATCH', token: admin, body: { role: 'admin' } }],
        // superadmin may edit only its own superadmin account and cannot delete a superadmin.
        [`/users/${anotherRoot.id}`, { method: 'PATCH', token: superadmin, body: { username: 'denied' } }],
        [`/users/${anotherRoot.id}`, { method: 'DELETE', token: superadmin }],
        [`/users/${root.id}`, { method: 'DELETE', token: superadmin }],
        [`/users/${anotherRoot.id}/role`, { method: 'PATCH', token: superadmin, body: { role: 'regular' } }],
      ];
      for (const [path, options] of attempts) {
        const response = await request(path, options);
        expect(response.status).toBe(403);
      }
      expect(await User.count()).toBe(4);
    });

    test('a disabled actor gets 401 for every protected endpoint, including writes', async () => {
      const { user, token } = await actor('admin', 'admin');
      const { user: target } = await seedUser('target');
      await user.update({ enabled: false });
      const cases = [
        ['/users', { token }],
        [`/users/${target.id}`, { token }],
        ['/users', { method: 'POST', token, body: userData('new') }],
        [`/users/${target.id}`, { method: 'PATCH', token, body: { enabled: false } }],
        [`/users/${target.id}/role`, { method: 'PATCH', token, body: { role: 'admin' } }],
        [`/users/${target.id}`, { method: 'DELETE', token }],
      ];
      for (const [path, options] of cases) {
        expect((await request(path, options)).status).toBe(401);
      }
      expect(await User.findByPk(target.id)).toBeTruthy();
    });

  });

  describe('Contrato y estados de autorización', () => {
    test('every documented HTTP response has an exercised integration scenario', () => {
      for (const [path, operations] of Object.entries(openApiDocument.paths)) {
        for (const [method, operation] of Object.entries(operations)) {
          const route = `${method.toUpperCase()} ${path}`;
          const observed = observedResponses.get(route) ?? new Set();
          for (const status of Object.keys(operation.responses)) {
            if (!observed.has(Number(status))) {
              throw new Error(`${route}: missing scenario for documented HTTP ${status}`);
            }
          }
        }
      }
    });

    test('authentication database failure reaches the central 500 handler without leaking details', async () => {
      const { user, token } = await actor('auth_failure');
      const originalFind = User.findByPk;
      const originalError = console.error;
      console.error = () => {};
      User.findByPk = async (id, ...args) => {
        if (String(id) === String(user.id)) throw new Error('private connection information');
        return originalFind.call(User, id, ...args);
      };
      try {
        const response = await request('/users', { token });
        expect(response.status).toBe(500);
        expect(response.data).toStrictEqual({ error: 'Error interno del servidor.' });
      } finally {
        User.findByPk = originalFind;
        console.error = originalError;
      }
    });

    test('authorization uses the current database role even when a valid token has an old or forged role', async () => {
      const jwt = (await import('jsonwebtoken')).default;
      const { user: adminUser, token: oldAdminToken } = await actor('changing_admin', 'admin');
      const { user: target } = await seedUser('target');

      const forgedRoleToken = jwt.sign({ role: 'superadmin' }, process.env.JWT_SECRET, {
        subject: String(adminUser.id), expiresIn: '1h', algorithm: 'HS256',
      });
      expect((await request(`/users/${target.id}/role`, {
        method: 'PATCH', token: forgedRoleToken, body: { role: 'admin' },
      })).status).toBe(403);

      await adminUser.update({ role: 'regular' });
      expect((await request('/users', { method: 'POST', token: oldAdminToken, body: userData('denied') })).status).toBe(403);
      expect((await request(`/users/${target.id}`, {
        method: 'PATCH', token: oldAdminToken, body: { username: 'denied' },
      })).status).toBe(403);
      await target.reload();
      expect(target.username).toBe('test_target');
      expect(await User.count()).toBe(2);
    });

    test('pagination preserves ordering and totals across full, partial and empty pages', async () => {
      const { token } = await actor('reader', 'regular');
      const first = await seedUser('first');
      const second = await seedUser('second', 'regular', false);
      const pages = [];
      for (const page of [1, 2, 3, 4]) {
        const result = await request(`/users?page=${page}&limit=1`, { token });
        expect(result.status).toBe(200);
        expect(result.data.pagination).toStrictEqual({ total: 3, page, limit: 1, totalPages: 3 });
        pages.push(result.data.users.map((user) => user.id));
      }
      expect(pages).toStrictEqual([[1], [first.user.id], [second.user.id], []]);
    });

    test('failed writes leave both the target and its related records unchanged', async () => {
      const { token: adminToken } = await actor('admin', 'admin');
      const { user: billed } = await seedUser('billed');
      const invoice = await Invoice.create({
        number: 'ATOMIC-001', userId: billed.id, customerName: 'Empresa Prueba SA',
        amount: '125.00', status: 'issued',
      });
      const forbidden = await request(`/users/${billed.id}/role`, {
        method: 'PATCH', token: adminToken, body: { role: 'admin' },
      });
      expect(forbidden.status).toBe(403);
      const invalid = await request(`/users/${billed.id}`, {
        method: 'PATCH', token: adminToken, body: { username: 'renamed', enabled: 'false' },
      });
      expect(invalid.status).toBe(400);
      const related = await request(`/users/${billed.id}`, { method: 'DELETE', token: adminToken });
      expect(related.status).toBe(409);
      await billed.reload();
      expect(billed.username).toBe('test_billed');
      expect(billed.role).toBe('regular');
      expect(billed.enabled).toBe(true);
      expect(await Invoice.findByPk(invoice.id)).toBeTruthy();
    });
  });

});
