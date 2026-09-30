import { describe, expect, jest, test } from '@jest/globals';
import { responseContext } from '../../src/middleweres/response-context.js';
import { clientContext } from '../../src/modules/clients/support/clients.context.js';
import { documentContext } from '../../src/modules/documents/support/documents.context.js';
import { invoiceContext } from '../../src/modules/invoices/support/invoices.context.js';
import { authContext } from '../../src/modules/auth/support/auth.context.js';
import { openApiDocument } from '../../src/swagger/index.js';

const resources = [
  ['clients', 'Client', clientContext],
  ['documents', 'Document', documentContext],
  ['invoices', 'Invoice', invoiceContext],
  ['auth', 'Auth', authContext],
];

describe('Contexto de respuestas para el agente', () => {
  test.each(resources)('%s agrega contexto sin modificar los datos ni omitir errores', (_resource, _prefix, context) => {
    const json = jest.fn();
    const res = { json };
    const next = jest.fn();
    responseContext(context)({}, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    for (const body of [
      { id: 1, amount: '123.45' },
      { documents: [], pagination: { total: 0, totalPages: 0 } },
      { message: 'Registro eliminado.' },
      { error: 'Solo se puede facturar una orden pendiente.' },
      { errors: [{ field: 'number', message: 'Entrada inválida.' }] },
    ]) {
      res.json(body);
      expect(json).toHaveBeenLastCalledWith({ ...body, context });
      expect(body).not.toHaveProperty('context');
    }
  });

  test.each(resources)('%s documenta contexto requerido en cada respuesta JSON', (resource, prefix) => {
    const paths = resource === 'auth'
      ? ['/auth/login']
      : [`/${resource}`, `/${resource}/{id}`];
    const schemas = openApiDocument.components.schemas;
    for (const path of paths) {
      for (const operation of Object.values(openApiDocument.paths[path])) {
        for (const response of Object.values(operation.responses)) {
          const ref = response.content['application/json'].schema.$ref;
          const schema = schemas[ref.split('/').at(-1)];
          expect(schema.required).toContain('context');
          expect(schema.properties.context.$ref).toBe(`#/components/schemas/${prefix}Context`);
        }
      }
    }
    if (resource !== 'auth') {
      expect(schemas[`${prefix}Response`].properties).not.toHaveProperty('context');
      expect(schemas[`${prefix}ListResponse`].properties[resource].items.$ref)
        .toBe(`#/components/schemas/${prefix}Response`);
    }
  });

  test('las eliminaciones exitosas admiten cuerpo y las facturas conservan el conflicto', () => {
    const paths = openApiDocument.paths;
    for (const resource of ['clients', 'documents']) {
      expect(paths[`/${resource}/{id}`].delete.responses).toHaveProperty('200');
      expect(paths[`/${resource}/{id}`].delete.responses).not.toHaveProperty('204');
    }
    expect(paths['/invoices/{id}'].delete.responses).toHaveProperty('409');
    expect(paths['/invoices/{id}'].delete.responses).not.toHaveProperty('200');
  });
});
