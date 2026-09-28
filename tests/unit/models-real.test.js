import { describe, expect, test } from '@jest/globals';

process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USER = 'unit-user';
process.env.DB_PASSWORD = 'unit-password';
process.env.DB_NAME = 'unit-database';
process.env.DB_SCHEMA = 'unit-real';
process.env.DB_TEST_SCHEMA = 'unit-test';
process.env.DB_USE_TEST_SCHEMA = 'false';

describe('Modelos y schema', () => {
  test('both models select the real schema when test mode is disabled', async () => {
    const { default: User } = await import('../../src/models/user.js');
    const { default: Invoice } = await import('../../src/models/invoice.js');
    const { sequelize } = await import('../../src/db/index.js');
    expect(User.getTableName().schema).toBe('unit-real');
    expect(Invoice.getTableName().schema).toBe('unit-real');
    await sequelize.close();
  });
});
