import 'dotenv/config';
import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import bcrypt from 'bcrypt';

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

function documentedRoute(path, method) {
  const pathname = new URL(path, 'http://localhost').pathname;
  if (pathname === '/auth/login') return `${method} /auth/login`;
  if (pathname === '/users') return `${method} /users`;
  if (/^\/users\/[^/]+\/role$/.test(pathname)) return `${method} /users/{id}/role`;
  if (/^\/users\/[^/]+$/.test(pathname)) return `${method} /users/{id}`;
  return null;
}

function assertUserResponse(user) {
  assert.deepEqual(Object.keys(user).sort(), [
    'id', 'username', 'email', 'role', 'enabled', 'createdAt', 'updatedAt',
  ].sort());
  assert.equal(typeof user.id, 'number');
  assert.equal(typeof user.username, 'string');
  assert.equal(typeof user.email, 'string');
  assert.ok(['regular', 'admin', 'superadmin'].includes(user.role));
  assert.equal(typeof user.enabled, 'boolean');
  assert.ok(!Number.isNaN(Date.parse(user.createdAt)));
  assert.ok(!Number.isNaN(Date.parse(user.updatedAt)));
}

function assertSuccessContract(route, status, data) {
  if (status === 204) {
    assert.equal(data, null, `${route} must not return a body`);
  } else if (route === 'POST /auth/login' && status === 200) {
    assert.deepEqual(Object.keys(data).sort(), ['accessToken', 'expiresIn', 'tokenType']);
  } else if (route === 'GET /users' && status === 200) {
    assert.deepEqual(Object.keys(data).sort(), ['pagination', 'users']);
    assert.deepEqual(Object.keys(data.pagination).sort(), ['limit', 'page', 'total', 'totalPages']);
    data.users.forEach(assertUserResponse);
  } else if (route && status >= 200 && status < 300) {
    assertUserResponse(data);
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
  assert.equal(response.status, 200, JSON.stringify(response.data));
  assert.equal(response.data.tokenType, 'Bearer');
  assert.equal(response.data.expiresIn, 3600);
  assert.ok(response.data.accessToken);
  return response.data.accessToken;
}

async function actor(suffix, role = 'superadmin') {
  const { user, data } = await seedUser(suffix, role);
  return { user, token: await login(data) };
}

function assertNoPassword(data) {
  assert.doesNotMatch(JSON.stringify(data), /password|StrongPass123!/i);
}

before(async () => {
  // Dynamic imports are essential: models choose their schema during import.
  ({ sequelize } = await import('../../src/db/index.js'));
  ({ default: User } = await import('../../src/models/user.js'));
  ({ default: Invoice } = await import('../../src/models/invoice.js'));
  await import('../../src/models/index.js');
  assert.equal(User.getTableName().schema, testSchema);
  assert.equal(Invoice.getTableName().schema, testSchema);
  await sequelize.authenticate();
  await sequelize.sync();
  const [foreignKeys] = await sequelize.query(`
    SELECT c.confdeltype
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = :schema AND t.relname = 'invoices' AND c.contype = 'f'
  `, { replacements: { schema: testSchema } });
  assert.ok(
    foreignKeys.some(({ confdeltype }) => confdeltype === 'r' || confdeltype === 'a'),
    'invoices.userId must block deleting a user with invoices; existing test-schema constraints may need ON DELETE RESTRICT',
  );
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

after(async () => {
  if (appServer) await new Promise((resolve) => appServer.close(resolve));
  if (sequelize) await sequelize.close();
});

test('Swagger UI is served and login validation rejects malformed input', async () => {
  const docs = await request('/api-docs/');
  assert.equal(docs.status, 200);
  assert.match(docs.data, /swagger-ui/i);
  const missing = await request('/auth/login', { method: 'POST', body: {} });
  assert.equal(missing.status, 400);
  assert.ok(missing.data.errors.some((error) => error.field === 'email'));
  const unknown = await request('/auth/login', {
    method: 'POST', body: { email: 'a@example.com', password, extra: true },
  });
  assert.equal(unknown.status, 400);
  const malformed = await request('/auth/login', { method: 'POST', rawBody: '{' });
  assert.equal(malformed.status, 400);
});

test('login verifies password, normalizes email and refuses disabled users', async () => {
  const { user, data } = await seedUser('login');
  const token = await login({ ...data, email: data.email.toUpperCase() });
  assert.equal((await request('/users', { token })).status, 200);
  assert.equal((await request('/auth/login', {
    method: 'POST', body: { email: data.email, password: 'wrong' },
  })).status, 401);
  assert.equal((await request('/auth/login', {
    method: 'POST', body: { email: 'missing@example.com', password },
  })).status, 401);
  await user.update({ enabled: false });
  assert.equal((await request('/auth/login', {
    method: 'POST', body: { email: data.email, password },
  })).status, 401);
  assert.equal((await request('/users', { token })).status, 401);
});

test('every users route requires a valid active bearer token', async () => {
  const routes = [
    ['/users', 'GET'], ['/users/1', 'GET'], ['/users', 'POST'],
    ['/users/1', 'PATCH'], ['/users/1/role', 'PATCH'], ['/users/1', 'DELETE'],
  ];
  for (const [path, method] of routes) {
    assert.equal((await request(path, { method })).status, 401, `${method} ${path}`);
    assert.equal((await request(path, { method, token: 'invalid' })).status, 401);
  }
});

test('superadmin creates a user, persists a bcrypt hash, reads and paginates without exposing it', async () => {
  const { token } = await actor('owner');
  const data = userData('created');
  const created = await request('/users', { method: 'POST', token, body: data });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  assert.equal(created.data.email, data.email);
  assertNoPassword(created.data);
  const row = await User.findByPk(created.data.id);
  assert.notEqual(row.passwordHash, password);
  assert.ok(await bcrypt.compare(password, row.passwordHash));
  const found = await request(`/users/${row.id}`, { token });
  assert.equal(found.status, 200);
  assertNoPassword(found.data);
  const listed = await request('/users?page=2&limit=1', { token });
  assert.equal(listed.status, 200);
  assert.equal(listed.data.pagination.total, 2);
  assert.equal(listed.data.pagination.page, 2);
  assert.equal(listed.data.users.length, 1);
  assertNoPassword(listed.data);
  assert.equal((await request('/users?page=0', { token })).status, 400);
  assert.equal((await request('/users/0', { token })).status, 400);
  assert.equal((await request('/users/9999', { token })).status, 404);
});

test('creation validates fields, rejects duplicates and enforces role hierarchy', async () => {
  const { token: superToken } = await actor('root');
  const { token: adminToken } = await actor('admin', 'admin');
  const { token: regularToken } = await actor('reader', 'regular');
  const data = userData('new');
  assert.equal((await request('/users', { method: 'POST', token: regularToken, body: data })).status, 403);
  assert.equal((await request('/users', {
    method: 'POST', token: adminToken, body: { ...data, role: 'admin' },
  })).status, 403);
  assert.equal((await request('/users', {
    method: 'POST', token: superToken, body: { ...data, role: 'superadmin' },
  })).status, 400);
  assert.equal((await request('/users', {
    method: 'POST', token: adminToken, body: { ...data, extra: true },
  })).status, 400);
  assert.equal((await request('/users', {
    method: 'POST', token: adminToken, body: { ...data, password: ' '.repeat(4) },
  })).status, 400);
  assert.equal((await request('/users', { method: 'POST', token: adminToken, body: data })).status, 201);
  assert.equal((await request('/users', {
    method: 'POST', token: adminToken, body: { ...data, email: 'different@example.com' },
  })).status, 409);
  assert.equal((await request('/users', {
    method: 'POST', token: adminToken, body: { ...data, username: 'different' },
  })).status, 409);
});

test('update changes fields and password; role changes use the dedicated superadmin route', async () => {
  const { token } = await actor('root');
  const { user, data } = await seedUser('target');
  const updated = await request(`/users/${user.id}`, {
    method: 'PATCH', token,
    body: { username: 'renamed', email: 'RENAMED@example.com', password: 'NewPassword123!' },
  });
  assert.equal(updated.status, 200, JSON.stringify(updated.data));
  assert.equal(updated.data.email, 'renamed@example.com');
  assertNoPassword(updated.data);
  await user.reload();
  assert.ok(await bcrypt.compare('NewPassword123!', user.passwordHash));
  assert.equal((await request('/auth/login', {
    method: 'POST', body: { email: data.email, password },
  })).status, 401);
  assert.equal((await request('/users/99999', {
    method: 'PATCH', token, body: { username: 'absent' },
  })).status, 404);
  assert.equal((await request(`/users/${user.id}`, {
    method: 'PATCH', token, body: { role: 'admin' },
  })).status, 400);
  assert.equal((await request(`/users/${user.id}`, {
    method: 'PATCH', token, body: {},
  })).status, 400);
  const promoted = await request(`/users/${user.id}/role`, {
    method: 'PATCH', token, body: { role: 'admin' },
  });
  assert.equal(promoted.status, 200, JSON.stringify(promoted.data));
  assert.equal(promoted.data.role, 'admin');
  assert.equal((await request(`/users/${user.id}/role`, {
    method: 'PATCH', token, body: { role: 'superadmin' },
  })).status, 400);
});

test('regular users cannot mutate; admin cannot edit admin; superadmin cannot be disabled or deleted', async () => {
  const { user: root, token: superToken } = await actor('root');
  const { user: admin, token: adminToken } = await actor('admin', 'admin');
  const { user: regular, token: regularToken } = await actor('regular', 'regular');
  assert.equal((await request(`/users/${regular.id}`, {
    method: 'PATCH', token: regularToken, body: { username: 'bad' },
  })).status, 403);
  assert.equal((await request(`/users/${admin.id}`, {
    method: 'PATCH', token: adminToken, body: { username: 'bad' },
  })).status, 403);
  assert.equal((await request(`/users/${regular.id}/role`, {
    method: 'PATCH', token: adminToken, body: { role: 'admin' },
  })).status, 403);
  assert.equal((await request(`/users/${root.id}`, {
    method: 'PATCH', token: superToken, body: { enabled: false },
  })).status, 403);
  assert.equal((await request(`/users/${root.id}`, {
    method: 'DELETE', token: superToken,
  })).status, 403);
});

test('delete removes a user and refuses one with related invoices', async () => {
  const { token } = await actor('root');
  const { user } = await seedUser('removable');
  assert.equal((await request(`/users/${user.id}`, { method: 'DELETE', token })).status, 204);
  assert.equal(await User.findByPk(user.id), null);
  assert.equal((await request(`/users/${user.id}`, { method: 'DELETE', token })).status, 404);
  const { user: billed } = await seedUser('billed');
  await Invoice.create({
    number: 'TEST-001', userId: billed.id, customerName: 'Empresa Prueba SA',
    amount: '125.00', status: 'issued',
  });
  const blocked = await request(`/users/${billed.id}`, { method: 'DELETE', token });
  assert.equal(blocked.status, 409, JSON.stringify(blocked.data));
  assert.ok(await User.findByPk(billed.id));
});

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
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.ok(response.data.errors.some((error) => error.field === field), JSON.stringify(response.data));
    assert.doesNotMatch(JSON.stringify(response.data), /StrongPass123!/);
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
    assert.equal((await request('/users', options)).status, 401);
  }
  await user.destroy();
  assert.equal((await request('/users', { token })).status, 401);
});

test('list includes disabled users, supports default and boundary pagination, rejects invalid query', async () => {
  const { token } = await actor('reader', 'regular');
  const { user: disabled } = await seedUser('disabled', 'regular', false);
  const defaults = await request('/users', { token });
  assert.equal(defaults.status, 200);
  assert.equal(defaults.data.pagination.page, 1);
  assert.equal(defaults.data.pagination.limit, 20);
  assert.ok(defaults.data.users.some((user) => user.id === disabled.id && user.enabled === false));
  for (const query of ['page=1&limit=100', 'page=100&limit=1']) {
    const response = await request(`/users?${query}`, { token });
    assert.equal(response.status, 200);
    assertNoPassword(response.data);
  }
  const empty = await request('/users?page=100&limit=1', { token });
  assert.deepEqual(empty.data.users, []);
  for (const query of ['page=0', 'page=-1', 'page=foo', 'limit=0', 'limit=101', 'limit=foo', 'extra=1']) {
    const response = await request(`/users?${query}`, { token });
    assert.equal(response.status, 400, query);
  }
});

test('read by ID allows every role and handles missing, malformed and out-of-range IDs', async () => {
  const { token: regular } = await actor('regular', 'regular');
  const { token: admin } = await actor('admin', 'admin');
  const { token: superadmin } = await actor('superadmin');
  const { user: target } = await seedUser('target', 'regular', false);
  for (const token of [regular, admin, superadmin]) {
    const response = await request(`/users/${target.id}`, { token });
    assert.equal(response.status, 200);
    assert.equal(response.data.enabled, false);
    assertNoPassword(response.data);
  }
  for (const id of ['0', '-1', 'abc', '2147483648']) {
    assert.equal((await request(`/users/${id}`, { token: regular })).status, 400, id);
  }
  assert.equal((await request('/users/999999', { token: regular })).status, 404);
});

test('create accepts default role and allowed roles, trims username and normalizes email', async () => {
  const { token: admin } = await actor('admin', 'admin');
  const { token: superadmin } = await actor('superadmin');
  const first = await request('/users', {
    method: 'POST', token: admin,
    body: { username: '  trimmed  ', email: 'UPPER@example.com', password },
  });
  assert.equal(first.status, 201, JSON.stringify(first.data));
  assert.equal(first.data.username, 'trimmed');
  assert.equal(first.data.email, 'upper@example.com');
  assert.equal(first.data.role, 'regular');
  assert.equal(first.data.enabled, true);
  const second = await request('/users', {
    method: 'POST', token: superadmin,
    body: userData('new_admin', 'admin'),
  });
  assert.equal(second.status, 201);
  assert.equal(second.data.role, 'admin');
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
    assert.equal(result.status, 400, `${field}: ${JSON.stringify(result.data)}`);
    assert.ok(result.data.errors.some((error) => error.field === field), JSON.stringify(result.data));
  }
  assert.equal(await User.count(), 1);
});

test('update validates ID, body fields and conflicts without modifying the target', async () => {
  const { token } = await actor('root');
  const { user } = await seedUser('target');
  const { user: existing } = await seedUser('existing');
  for (const id of ['0', '-1', 'abc', '2147483648']) {
    assert.equal((await request(`/users/${id}`, { method: 'PATCH', token, body: { enabled: false } })).status, 400, id);
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
    assert.equal(result.status, 400, JSON.stringify(body));
  }
  for (const body of [{ username: existing.username }, { email: existing.email }]) {
    assert.equal((await request(`/users/${user.id}`, { method: 'PATCH', token, body })).status, 409);
  }
  await user.reload();
  assert.equal(user.username, 'test_target');
  assert.equal(user.email, 'test_target@example.com');
  assert.equal(user.enabled, true);
  assert.equal((await request('/users/99999', { method: 'PATCH', token, body: { enabled: false } })).status, 404);
});

test('update permission matrix and enabled toggle', async () => {
  const { user: root, token: superadmin } = await actor('root');
  const { user: adminUser, token: admin } = await actor('admin', 'admin');
  const { user: regularUser, token: regular } = await actor('regular', 'regular');
  const allowed = await request(`/users/${regularUser.id}`, { method: 'PATCH', token: admin, body: { enabled: false } });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.data.enabled, false);
  assert.equal((await request('/auth/login', {
    method: 'POST', body: { email: 'test_regular@example.com', password },
  })).status, 401);
  assert.equal((await request(`/users/${regularUser.id}`, { method: 'PATCH', token: admin, body: { enabled: true } })).status, 200);
  assert.equal((await request(`/users/${adminUser.id}`, { method: 'PATCH', token: superadmin, body: { username: 'edited_admin' } })).status, 200);
  assert.equal((await request(`/users/${root.id}`, { method: 'PATCH', token: superadmin, body: { username: 'edited_root' } })).status, 200);
  assert.equal((await request(`/users/${adminUser.id}`, { method: 'PATCH', token: admin, body: { username: 'forbidden' } })).status, 403);
  assert.equal((await request(`/users/${root.id}`, { method: 'PATCH', token: admin, body: { username: 'forbidden' } })).status, 403);
  assert.equal((await request(`/users/${regularUser.id}`, { method: 'PATCH', token: regular, body: { username: 'forbidden' } })).status, 403);
  assert.equal((await request(`/users/${root.id}`, { method: 'PATCH', token: superadmin, body: { enabled: false } })).status, 403);
});

test('role endpoint validates ID and body and covers promotion, demotion and permissions', async () => {
  const { user: root, token: superadmin } = await actor('root');
  const { user: adminUser, token: admin } = await actor('admin', 'admin');
  const { user: regularUser, token: regular } = await actor('regular', 'regular');
  for (const id of ['0', '-1', 'abc', '2147483648']) {
    assert.equal((await request(`/users/${id}/role`, { method: 'PATCH', token: superadmin, body: { role: 'admin' } })).status, 400, id);
  }
  for (const body of [{}, { role: 'superadmin' }, { role: 42 }, { role: 'admin', extra: true }]) {
    assert.equal((await request(`/users/${regularUser.id}/role`, { method: 'PATCH', token: superadmin, body })).status, 400, JSON.stringify(body));
  }
  assert.equal((await request('/users/99999/role', { method: 'PATCH', token: superadmin, body: { role: 'admin' } })).status, 404);
  assert.equal((await request(`/users/${regularUser.id}/role`, { method: 'PATCH', token: admin, body: { role: 'admin' } })).status, 403);
  assert.equal((await request(`/users/${regularUser.id}/role`, { method: 'PATCH', token: regular, body: { role: 'admin' } })).status, 403);
  assert.equal((await request(`/users/${root.id}/role`, { method: 'PATCH', token: superadmin, body: { role: 'admin' } })).status, 403);
  const promoted = await request(`/users/${regularUser.id}/role`, { method: 'PATCH', token: superadmin, body: { role: 'admin' } });
  assert.equal(promoted.status, 200);
  assert.equal(promoted.data.role, 'admin');
  const demoted = await request(`/users/${adminUser.id}/role`, { method: 'PATCH', token: superadmin, body: { role: 'regular' } });
  assert.equal(demoted.status, 200);
  assert.equal(demoted.data.role, 'regular');
});

test('delete validates IDs and covers admin/superadmin permission matrix', async () => {
  const { user: root, token: superadmin } = await actor('root');
  const { user: adminUser, token: admin } = await actor('admin', 'admin');
  const { user: regularUser, token: regular } = await actor('regular', 'regular');
  for (const id of ['0', '-1', 'abc', '2147483648']) {
    assert.equal((await request(`/users/${id}`, { method: 'DELETE', token: superadmin })).status, 400, id);
  }
  assert.equal((await request('/users/99999', { method: 'DELETE', token: superadmin })).status, 404);
  assert.equal((await request(`/users/${regularUser.id}`, { method: 'DELETE', token: regular })).status, 403);
  assert.equal((await request(`/users/${adminUser.id}`, { method: 'DELETE', token: admin })).status, 403);
  assert.equal((await request(`/users/${root.id}`, { method: 'DELETE', token: superadmin })).status, 403);
  assert.equal((await request(`/users/${regularUser.id}`, { method: 'DELETE', token: admin })).status, 204);
  assert.equal((await request(`/users/${adminUser.id}`, { method: 'DELETE', token: superadmin })).status, 204);
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
        assert.equal(result.status, 500, `${options?.method ?? 'GET'} ${path}: ${JSON.stringify(result.data)}`);
        assert.deepEqual(result.data, { error: 'Error interno del servidor.' });
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
        assert.equal(result.status, 500, `${options.method ?? 'GET'} ${path}`);
        assert.deepEqual(result.data, { error: 'Error interno del servidor.' });
      }
    } finally {
      User.findByPk = originalFind;
    }
  } finally {
    console.error = originalError;
  }
});



test('every write route handles malformed JSON, unknown properties and invalid content types', async () => {
  const { user, token } = await actor('root');
  const routes = [
    ['/users', userData('input')],
    [`/users/${user.id}`, { username: 'changed' }],
    [`/users/${user.id}/role`, { role: 'admin' }],
  ];
  for (const [path, validBody] of routes) {
    const malformed = await request(path, { method: path === '/users' ? 'POST' : 'PATCH', token, rawBody: '{' });
    assert.equal(malformed.status, 400, path);
    assert.ok(malformed.data.errors.some((error) => error.field === 'body'));
    const unknown = await request(path, {
      method: path === '/users' ? 'POST' : 'PATCH', token,
      body: { ...validBody, unexpected: 'ignored?' },
    });
    assert.equal(unknown.status, 400, path);
    assert.ok(unknown.data.errors.some((error) => error.field === 'unexpected'));
    const wrongType = await request(path, {
      method: path === '/users' ? 'POST' : 'PATCH', token,
      rawBody: JSON.stringify(validBody), headers: { 'Content-Type': 'text/plain' },
    });
    assert.equal(wrongType.status, 400, path);
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
  assert.equal(created.status, 201, JSON.stringify(created.data));
  assert.equal(created.data.username.length, 255);
  assert.ok(await bcrypt.compare(maxPassword, (await User.findByPk(created.data.id)).passwordHash));
  const sameEmail = await request('/users', {
    method: 'POST', token, body: { ...userData('duplicate'), email: 'BOUNDARY@example.com' },
  });
  assert.equal(sameEmail.status, 409);
  const updated = await request(`/users/${created.data.id}`, {
    method: 'PATCH', token, body: { password: maxPassword, username: 'u'.repeat(255) },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.username.length, 255);
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
    assert.equal(response.status, 403, `${options.method} ${path}: ${JSON.stringify(response.data)}`);
  }
  assert.equal(await User.count(), 4);
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
    assert.equal((await request(path, options)).status, 401, `${options.method ?? 'GET'} ${path}`);
  }
  assert.ok(await User.findByPk(target.id));
});

test('every documented HTTP response has an exercised integration scenario', () => {
  for (const [path, operations] of Object.entries(openApiDocument.paths)) {
    for (const [method, operation] of Object.entries(operations)) {
      const route = `${method.toUpperCase()} ${path}`;
      const observed = observedResponses.get(route) ?? new Set();
      for (const status of Object.keys(operation.responses)) {
        assert.ok(observed.has(Number(status)), `${route}: missing scenario for documented HTTP ${status}`);
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
    assert.equal(response.status, 500);
    assert.deepEqual(response.data, { error: 'Error interno del servidor.' });
  } finally {
    User.findByPk = originalFind;
    console.error = originalError;
  }
});
