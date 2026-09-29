import { describe, expect, test } from '@jest/globals';
import { openApiDocument } from '../../src/swagger/index.js';
import { userPaths, userSchemas } from '../../src/swagger/users.js';
import { invoicePaths, invoiceSchemas } from '../../src/swagger/invoices.js';

describe('Organización de Swagger', () => {
  test('muestra Auth, Users e Invoices en ese orden y compone sus esquemas', () => {
    expect(Object.keys(openApiDocument.paths)).toEqual([
      '/auth/login',
      ...Object.keys(userPaths),
      ...Object.keys(invoicePaths),
    ]);

    for (const [name, schema] of Object.entries({ ...userSchemas, ...invoiceSchemas })) {
      expect(openApiDocument.components.schemas[name]).toBe(schema);
    }
  });
});
