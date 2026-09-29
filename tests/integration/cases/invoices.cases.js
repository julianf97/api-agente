import { beforeAll, describe, expect, test } from '@jest/globals';

export function registerInvoiceCases(context) {
  const { request, actor } = context;

  let User;
  let Invoice;
  beforeAll(() => {
    User = context.User;
    Invoice = context.Invoice;
  });

  describe('CRUD de facturas', () => {
    const payload = (number) => ({ number, customerName: 'Cliente SA', amount: '125.00' });
    const seedInvoice = (userId, number, status = 'draft') =>
      Invoice.create({ ...payload(number), userId, status });

    test('admin y superadmin administran facturas; regular ve solo las propias y edita su borrador', async () => {
      const owner = await actor('invoice_owner', 'regular');
      const other = await actor('invoice_other', 'regular');
      const admin = await actor('invoice_admin', 'admin');
      const superadmin = await actor('invoice_super', 'superadmin');
      const own = await request('/invoices', { method: 'POST', token: owner.token, body: payload('INV-001') });
      expect(own.status).toBe(201);
      expect(own.data).toMatchObject({ userId: owner.user.id, status: 'draft', amount: '125.00' });
      expect(own.data.issuedAt).toBeNull();
      const another = await request('/invoices', {
        method: 'POST', token: admin.token,
        body: { ...payload('INV-002'), userId: other.user.id, status: 'issued' },
      });
      expect(another.status).toBe(201);
      expect(another.data.issuedAt).toBeTruthy();
      expect((await request('/invoices', { token: owner.token })).data.invoices.map(({ id }) => id)).toEqual([own.data.id]);
      const adminList = await request('/invoices?page=1&limit=1', { token: admin.token });
      expect(adminList.data.pagination).toEqual({ total: 2, page: 1, limit: 1, totalPages: 2 });
      expect((await request('/invoices', { token: superadmin.token })).data.invoices).toHaveLength(2);
      expect((await request(`/invoices/${another.data.id}`, { token: owner.token })).status).toBe(404);
      expect((await request(`/invoices/${own.data.id}`, { token: other.token })).status).toBe(404);
      expect((await request(`/invoices/${own.data.id}`, { token: owner.token })).data.number).toBe('INV-001');
      const edit = await request(`/invoices/${own.data.id}`, {
        method: 'PATCH', token: owner.token,
        body: { number: ' INV-003 ', customerName: ' Otra SA ', amount: '1.50' },
      });
      expect(edit.data).toMatchObject({ number: 'INV-003', customerName: 'Otra SA', amount: '1.50' });
      const paid = await request(`/invoices/${own.data.id}`, {
        method: 'PATCH', token: superadmin.token, body: { status: 'paid', userId: other.user.id },
      });
      expect(paid.data).toMatchObject({ status: 'paid', userId: other.user.id });
      expect(paid.data.issuedAt).toBeTruthy();
      expect((await request(`/invoices/${own.data.id}`, {
        method: 'PATCH', token: other.token, body: { amount: '2.00' },
      })).status).toBe(403);
      expect((await request(`/invoices/${own.data.id}`, { method: 'DELETE', token: admin.token })).status).toBe(204);
      expect(await Invoice.findByPk(own.data.id)).toBeNull();
      expect((await request(`/invoices/${another.data.id}`, { method: 'DELETE', token: superadmin.token })).status).toBe(204);
    });

    test('permisos, existencia, duplicados y validación impiden cambios parciales', async () => {
      const regular = await actor('invoice_regular', 'regular');
      const other = await actor('invoice_second', 'regular');
      const admin = await actor('invoice_manager', 'admin');
      const draft = await seedInvoice(regular.user.id, 'EXISTING');
      const issued = await seedInvoice(regular.user.id, 'ISSUED', 'issued');
      const foreign = await seedInvoice(other.user.id, 'FOREIGN');
      const post = (token, body) => request('/invoices', { method: 'POST', token, body });
      const patch = (id, token, body) => request(`/invoices/${id}`, { method: 'PATCH', token, body });
      for (const body of [
        { ...payload('BAD-OWNER'), userId: other.user.id },
        { ...payload('BAD-STATUS'), status: 'issued' },
      ]) expect((await post(regular.token, body)).status).toBe(403);
      expect((await post(admin.token, { ...payload('MISSING-OWNER'), userId: 999999 })).status).toBe(404);
      expect((await post(admin.token, payload('EXISTING'))).status).toBe(409);
      expect((await patch(draft.id, regular.token, { status: 'issued' })).status).toBe(403);
      expect((await patch(draft.id, regular.token, { userId: other.user.id })).status).toBe(403);
      expect((await patch(issued.id, regular.token, { amount: '2.00' })).status).toBe(403);
      expect((await patch(foreign.id, regular.token, { amount: '2.00' })).status).toBe(404);
      expect((await patch(draft.id, admin.token, { userId: 999999 })).status).toBe(404);
      expect((await patch(draft.id, admin.token, { number: 'FOREIGN' })).status).toBe(409);
      expect((await patch(999999, admin.token, { amount: '2.00' })).status).toBe(404);
      expect((await request('/invoices/999999', { token: admin.token })).status).toBe(404);
      expect((await request('/invoices/999999', { method: 'DELETE', token: admin.token })).status).toBe(404);
      expect((await request(`/invoices/${draft.id}`, { method: 'DELETE', token: regular.token })).status).toBe(403);
      expect((await request('/invoices', { token: regular.token })).data.invoices).toHaveLength(2);
      await draft.reload();
      expect(draft).toMatchObject({ number: 'EXISTING', userId: regular.user.id, status: 'draft', amount: '125.00' });
      expect(await Invoice.count()).toBe(3);
    });

    test('cuerpos, consultas e IDs inválidos devuelven 400; falta de token devuelve 401', async () => {
      const { token } = await actor('invoice_validation', 'admin');
      const valid = payload('VALID');
      const invoice = await seedInvoice(1, 'ID-VALID');
      for (const body of [
        {}, { ...valid, amount: 1 }, { ...valid, amount: '0.00' },
        { ...valid, amount: '1.001' }, { ...valid, amount: '10000000000.00' },
        { ...valid, number: '   ' }, { ...valid, customerName: '' },
        { ...valid, status: 'sent' }, { ...valid, userId: '1.5' }, { ...valid, userId: '1' },
        { ...valid, issuedAt: '2024-01-01' },
      ]) expect((await request('/invoices', { method: 'POST', token, body })).status).toBe(400);
      for (const body of [{}, { amount: '-1' }, { status: 'wrong' }, { foo: 'x' }]) {
        expect((await request(`/invoices/${invoice.id}`, { method: 'PATCH', token, body })).status).toBe(400);
      }
      for (const path of ['/invoices?page=0', '/invoices?limit=101', '/invoices?unknown=1']) {
        expect((await request(path, { token })).status).toBe(400);
      }
      for (const method of ['GET', 'PATCH', 'DELETE']) {
        expect((await request('/invoices/0', { method, token, body: method === 'PATCH' ? { amount: '1.00' } : undefined })).status).toBe(400);
      }
      for (const [path, method, body] of [
        ['/invoices', 'GET'], ['/invoices', 'POST', valid], ['/invoices/1', 'GET'],
        ['/invoices/1', 'PATCH', { amount: '1.00' }], ['/invoices/1', 'DELETE'],
      ]) expect((await request(path, { method, body })).status).toBe(401);
      expect(await Invoice.count()).toBe(1);
    });

    test('errores inesperados responden 500 en cada operación sin exponer detalles', async () => {
      const { user, token } = await actor('invoice_failure', 'admin');
      const originalFind = User.findByPk;
      const originalError = console.error;
      console.error = () => {};
      User.findByPk = async (id, ...args) => {
        if (Number(id) === user.id) throw new Error('private invoice connection information');
        return originalFind.call(User, id, ...args);
      };
      try {
        for (const [path, method, body] of [
          ['/invoices', 'GET'], ['/invoices', 'POST', payload('ERROR')],
          ['/invoices/1', 'GET'], ['/invoices/1', 'PATCH', { amount: '1.00' }],
          ['/invoices/1', 'DELETE'],
        ]) {
          const result = await request(path, { method, token, body });
          expect(result.status).toBe(500);
          expect(result.data).toEqual({ error: 'Error interno del servidor.' });
        }
      } finally {
        User.findByPk = originalFind;
        console.error = originalError;
      }
    });
  });
}
