import { beforeEach, expect, jest, test } from '@jest/globals';
import { toDemoDocuments, demoClients } from '../../src/db/demo/demo.data.js';

let users;
let clients;
let documents;
const hashUserPassword = jest.fn(async () => 'demo-hash');
jest.unstable_mockModule('../../src/modules/users/support/users.mapper.js', () => ({ hashUserPassword }));
jest.unstable_mockModule('../../src/db/demo/demo.repository.js', () => ({
  inDemoTransaction: (action) => action({}),
  lockDemoSeed: jest.fn(),
  findDemoUser: async (email) => users.get(email),
  createDemoUser: async (data) => {
    const user = { ...data, id: users.size + 1 };
    users.set(data.email, user);
    return user;
  },
  findOrCreateDemoClient: async (data) => {
    const key = `${data.country}:${data.taxId}`;
    if (!clients.has(key)) clients.set(key, { ...data, id: clients.size + 1 });
    return clients.get(key);
  },
  findOrCreateDemoDocument: async (data) => {
    if (documents.has(data.number)) return false;
    documents.set(data.number, { ...data });
    return true;
  },
}));
const { seedDemo } = await import('../../src/db/demo/demo.service.js');

beforeEach(() => {
  users = new Map();
  clients = new Map();
  documents = new Map();
  hashUserPassword.mockClear();
  process.env.DB_SCHEMA = 'api-agente';
  process.env.DB_TEST_SCHEMA = 'api-agente-test';
  process.env.DB_USE_TEST_SCHEMA = 'false';
});

test('demo contains 150 OV and 150 documents distributed across four other types', () => {
  const data = toDemoDocuments({ id: 51 }, demoClients.map((client, index) => ({ ...client, id: index + 1 })));
  expect(data).toHaveLength(300);
  expect(new Set(data.map((document) => document.number)).size).toBe(300);
  for (const [type, count] of [['OV', 150], ['OC', 38], ['PR', 38], ['RE', 37], ['NC', 37]]) {
    expect(data.filter((document) => document.type === type)).toHaveLength(count);
  }
  expect(data.every((document) => document.status === 'pending' && document.userId === 51)).toBe(true);
  for (const document of data.filter((document) => document.type === 'OV')) {
    const client = demoClients[document.clientId - 1];
    if (client.country !== 'AR') expect(document.isExport).toBe(true);
  }
});

test('restarts neither duplicate demo data nor reset documents already invoiced', async () => {
  await expect(seedDemo()).resolves.toEqual({ expected: 300, created: 300, existing: 0 });
  const issued = documents.get('DEMO-OV-0001');
  issued.status = 'invoiced';
  await expect(seedDemo()).resolves.toEqual({ expected: 300, created: 0, existing: 300 });
  expect(documents.size).toBe(300);
  expect(users.size).toBe(2);
  expect(clients.size).toBe(5);
  expect(documents.get('DEMO-OV-0001')).toBe(issued);
  expect(issued.status).toBe('invoiced');
  expect(hashUserPassword).toHaveBeenCalledTimes(2);
  expect([...users.values()].every((user) => !Object.hasOwn(user, 'password'))).toBe(true);
});

test('existing regular user is reused without changing credentials', async () => {
  const user = { id: 51, email: 'regular@example.com', enabled: true, role: 'regular', passwordHash: 'existing-hash' };
  users.set(user.email, user);
  await seedDemo();
  expect(users.get(user.email)).toBe(user);
  expect(documents.get('DEMO-OV-0001').userId).toBe(51);
  expect(user.passwordHash).toBe('existing-hash');
});

test('demo loading refuses test schemas and incompatible existing users', async () => {
  process.env.DB_USE_TEST_SCHEMA = 'true';
  await expect(seedDemo()).rejects.toThrow('separado de tests');
  expect(documents.size).toBe(0);
  process.env.DB_USE_TEST_SCHEMA = 'false';
  users.set('admin@example.com', { enabled: false, role: 'admin' });
  await expect(seedDemo()).rejects.toThrow('habilitado');
  expect(documents.size).toBe(0);
});
