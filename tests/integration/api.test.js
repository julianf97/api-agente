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
