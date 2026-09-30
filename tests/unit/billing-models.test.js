import { beforeAll, afterAll, describe, expect, test } from '@jest/globals';

process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USER = 'unit';
process.env.DB_PASSWORD = 'unit';
process.env.DB_NAME = 'unit';
process.env.DB_SCHEMA = 'billing-unit';
process.env.DB_USE_TEST_SCHEMA = 'false';

let models;
let sequelize;
beforeAll(async () => {
  models = await import('../../src/models/index.js');
  ({ sequelize } = await import('../../src/db/index.js'));
});
afterAll(async () => { await sequelize.close(); });

describe('Billing models without database mutation', () => {
  test('all four models use the selected schema and restricted foreign keys', () => {
    for (const [name, table] of [['User', 'users'], ['Client', 'clients'], ['Document', 'documents'], ['Invoice', 'invoices']]) {
      expect(models[name].getTableName()).toMatchObject({ tableName: table, schema: 'billing-unit' });
    }
    const { Document, Invoice } = models;
    for (const model of [Document, Invoice]) {
      for (const field of ['clientId', 'userId']) {
        expect(model.rawAttributes[field]).toMatchObject({ allowNull: false, onDelete: 'RESTRICT' });
      }
    }
    expect(Invoice.rawAttributes.documentId).toMatchObject({ unique: true, allowNull: false, onDelete: 'RESTRICT' });
    expect(Document.associations.Invoice.associationType).toBe('HasOne');
  });

  test('only admin and regular are valid user roles', async () => {
    const data = { username: 'user', email: 'user@example.com', passwordHash: 'hash' };
    for (const role of ['admin', 'regular']) {
      await expect(models.User.build({ ...data, role }).validate()).resolves.toBeDefined();
    }
    await expect(models.User.build({ ...data, role: 'superadmin' }).validate()).rejects.toThrow();
  });

  test('local clients require tax condition; foreign clients may omit it', async () => {
    const data = { name: 'Client', taxId: '123', address: 'Address' };
    await expect(models.Client.build({ ...data, country: 'AR' }).validate()).rejects.toThrow();
    await expect(models.Client.build({ ...data, country: 'AR', taxCondition: 'monotributista' }).validate()).resolves.toBeDefined();
    await expect(models.Client.build({ ...data, country: 'UY' }).validate()).resolves.toBeDefined();
    await expect(models.Client.build({ ...data, country: 'ARG' }).validate()).rejects.toThrow();
  });

  test('orders default to pending OV and reject invalid amounts', async () => {
    const data = { number: 'OV-1', userId: 1, clientId: 1, amount: '100.00' };
    const order = models.Document.build(data);
    expect(order.get()).toMatchObject({ type: 'OV', status: 'pending', isExport: false });
    await expect(order.validate()).resolves.toBeDefined();
    await expect(models.Document.build({ ...data, amount: '-1.00' }).validate()).rejects.toThrow();
  });

  test('documents admit five commercial types', async () => {
    const data = { number: 'DOC-1', userId: 1, clientId: 1, amount: '100.00' };
    expect(models.Document.rawAttributes.type.values).toEqual(['OV', 'OC', 'PR', 'RE', 'NC']);
    for (const type of ['OV', 'OC', 'PR', 'RE', 'NC']) {
      await expect(models.Document.build({ ...data, type }).validate()).resolves.toBeDefined();
    }
  });

  test('generated invoices require origin, class and customer snapshot', async () => {
    const data = { number: 'A-1', documentId: 1, userId: 1, clientId: 1, type: 'A', customerName: 'Client', customerTaxId: '123', customerCountry: 'AR', customerAddress: 'Address', amount: '100.00' };
    const invoice = models.Invoice.build(data);
    expect(invoice.status).toBe('issued');
    await expect(invoice.validate()).resolves.toBeDefined();
    await expect(models.Invoice.build({ ...data, documentId: null }).validate()).rejects.toThrow();
    await expect(models.Invoice.build({ ...data, customerTaxId: null }).validate()).rejects.toThrow();
    expect(models.Invoice.rawAttributes.type.values).toEqual(['A', 'B', 'E']);
  });
});

