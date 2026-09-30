import { describe, expect, test } from '@jest/globals';
import { clientContext } from '../../../src/modules/clients/support/clients.context.js';
import { documentContext } from '../../../src/modules/documents/support/documents.context.js';
import { invoiceContext } from '../../../src/modules/invoices/support/invoices.context.js';
import { authContext } from '../../../src/modules/auth/support/auth.context.js';

const resources = [
  ['clients', clientContext, 'Client'],
  ['documents', documentContext, 'Document'],
  ['invoices', invoiceContext, 'Invoice'],
];

export function registerBillingContractCases(context) {
  const { request, actor } = context;

  describe('Contrato HTTP de errores y contexto', () => {
    test.each([
      ['auth/login', authContext],
      ...resources.map(([name, metadata]) => [name, metadata]),
    ])('%s conserva contexto al rechazar JSON malformado', async (path, metadata) => {
      const result = await request(`/${path}`, { method: 'POST', rawBody: '{' });
      expect(result.status).toBe(400);
      expect(result.data.context).toStrictEqual(metadata);
      expect(result.data.errors).toEqual([
        expect.objectContaining({ field: 'body', message: expect.any(String) }),
      ]);
    });

    test.each(resources)('%s valida autorización, IDs, paginación y errores 500 con contexto', async (resource, metadata, modelName) => {
      const { token } = await actor('contract', 'regular');
      const operations = [
        [`/${resource}`, 'GET'], [`/${resource}`, 'POST'],
        [`/${resource}/999999`, 'GET'], [`/${resource}/999999`, 'PATCH'],
        [`/${resource}/999999`, 'DELETE'],
      ];
      for (const [path, method] of operations) {
        for (const invalidToken of [undefined, 'invalid']) {
          const result = await request(path, { method, token: invalidToken });
          expect(result.status).toBe(401);
          expect(result.data.context).toStrictEqual(metadata);
        }
      }
      for (const query of ['page=0', 'limit=101', 'extra=true']) {
        expect((await request(`/${resource}?${query}`, { token })).status).toBe(400);
      }
      for (const id of ['0', '01', '2147483648', 'abc']) {
        for (const method of ['GET', 'PATCH', 'DELETE']) {
          expect((await request(`/${resource}/${id}`, { token, method, body: method === 'PATCH' ? {} : undefined })).status).toBe(400);
        }
      }
      for (const method of ['GET', 'DELETE']) {
        expect((await request(`/${resource}/999999`, { token, method })).status).toBe(404);
      }
      const empty = await request(`/${resource}`, { token });
      expect(empty.data[resource]).toEqual([]);
      expect(empty.data.context).toStrictEqual(metadata);
      expect(empty.data.pagination).toStrictEqual({ total: 0, page: 1, limit: 20, totalPages: 0 });

      const model = context[modelName];
      const original = model.findAndCountAll;
      const originalError = console.error;
      model.findAndCountAll = async () => { throw new Error('private database details'); };
      console.error = () => {};
      try {
        const failed = await request(`/${resource}`, { token });
        expect(failed.status).toBe(500);
        expect(failed.data).toStrictEqual({ error: 'Error interno del servidor.', context: metadata });
      } finally {
        model.findAndCountAll = original;
        console.error = originalError;
      }
    });
  });
}
