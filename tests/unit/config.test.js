import { expect, test } from '@jest/globals';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

// Import in a child process so the parent's JWT module cache cannot conceal missing configuration.
test('startup rejects a missing JWT secret', () => {
  const moduleUrl = new URL('../../src/config/jwt.js', import.meta.url).href;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(moduleUrl)})`], {
    cwd: tmpdir(),
    env: { ...process.env, JWT_SECRET: '' },
    encoding: 'utf8',
  });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toMatch(/Falta configurar JWT_SECRET/);
});

test('database initializer authenticates and syncs only for the selected test schema', async () => {
  process.env.DB_HOST = 'localhost';
  process.env.DB_PORT = '5432';
  process.env.DB_USER = 'unit-user';
  process.env.DB_PASSWORD = 'unit-password';
  process.env.DB_NAME = 'unit-database';
  process.env.DB_SCHEMA = 'unit-real';
  process.env.DB_TEST_SCHEMA = 'unit-test';
  process.env.DB_USE_TEST_SCHEMA = 'false';
  const { sequelize, initializeDatabase } = await import('../../src/db/index.js');
  const authenticate = sequelize.authenticate;
  const sync = sequelize.sync;
  let authenticated = 0;
  let synced = 0;
  sequelize.authenticate = async () => { authenticated += 1; };
  sequelize.sync = async () => { synced += 1; };
  try {
    await initializeDatabase();
    expect(authenticated).toBe(1);
    expect(synced).toBe(0);
    process.env.DB_USE_TEST_SCHEMA = 'true';
    await initializeDatabase();
    expect(authenticated).toBe(2);
    expect(synced).toBe(1);
    const { default: User } = await import('../../src/models/user.js');
    expect(User.getTableName().schema).toBe('unit-test');
  } finally {
    sequelize.authenticate = authenticate;
    sequelize.sync = sync;
    await sequelize.close();
  }
});
