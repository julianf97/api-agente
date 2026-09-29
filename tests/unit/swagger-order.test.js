import { describe, expect, test } from '@jest/globals';
import { openApiDocument, sortSwaggerOperations } from '../../src/swagger/index.js';
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

  test('ordena ambas secciones como GET lista, GET por ID, POST, PATCH y DELETE', () => {
    const operation = (method, path) => ({
      get: (key) => ({ method, path })[key],
    });

    for (const moduleName of ['users', 'invoices']) {
      const operations = [
        operation('delete', `/${moduleName}/{id}`),
        operation('patch', `/${moduleName}/{id}`),
        operation('post', `/${moduleName}`),
        operation('get', `/${moduleName}/{id}`),
        operation('get', `/${moduleName}`),
      ];

      expect(operations.sort(sortSwaggerOperations).map((entry) => [
        entry.get('method'), entry.get('path'),
      ])).toEqual([
        ['get', `/${moduleName}`],
        ['get', `/${moduleName}/{id}`],
        ['post', `/${moduleName}`],
        ['patch', `/${moduleName}/{id}`],
        ['delete', `/${moduleName}/{id}`],
      ]);
    }

    const rolePatch = operation('patch', '/users/{id}/role');
    const userDelete = operation('delete', '/users/{id}');
    expect(sortSwaggerOperations(rolePatch, userDelete)).toBeLessThan(0);
  });
});
