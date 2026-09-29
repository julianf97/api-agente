import { beforeAll, describe, expect, test } from '@jest/globals';

export function registerContractCases(context) {
  const { request, actor, seedUser, userData } = context;

  let User;
  let Invoice;
  beforeAll(() => {
    User = context.User;
    Invoice = context.Invoice;
  });

  describe('Contrato y estados de autorización', () => {
    test('authentication database failure reaches the central 500 handler without leaking details', async () => {
      const { user, token } = await actor('auth_failure');
      const originalFind = User.findByPk;
      const originalError = console.error;
      console.error = () => {};
      User.findByPk = async (id, ...args) => {
        if (String(id) === String(user.id)) throw new Error('private connection information');
        return originalFind.call(User, id, ...args);
      };
      try {
        const response = await request('/users', { token });
        expect(response.status).toBe(500);
        expect(response.data).toStrictEqual({ error: 'Error interno del servidor.' });
      } finally {
        User.findByPk = originalFind;
        console.error = originalError;
      }
    });

    test('authorization uses the current database role even when a valid token has an old or forged role', async () => {
      const jwt = (await import('jsonwebtoken')).default;
      const { user: adminUser, token: oldAdminToken } = await actor('changing_admin', 'admin');
      const { user: target } = await seedUser('target');

      const forgedRoleToken = jwt.sign({ role: 'superadmin' }, process.env.JWT_SECRET, {
        subject: String(adminUser.id), expiresIn: '1h', algorithm: 'HS256',
      });
      expect((await request(`/users/${target.id}/role`, {
        method: 'PATCH', token: forgedRoleToken, body: { role: 'admin' },
      })).status).toBe(403);

      await adminUser.update({ role: 'regular' });
      expect((await request('/users', { method: 'POST', token: oldAdminToken, body: userData('denied') })).status).toBe(403);
      expect((await request(`/users/${target.id}`, {
        method: 'PATCH', token: oldAdminToken, body: { username: 'denied' },
      })).status).toBe(403);
      await target.reload();
      expect(target.username).toBe('test_target');
      expect(await User.count()).toBe(2);
    });

    test('pagination preserves ordering and totals across full, partial and empty pages', async () => {
      const { token } = await actor('reader', 'regular');
      const first = await seedUser('first');
      const second = await seedUser('second', 'regular', false);
      const pages = [];
      for (const page of [1, 2, 3, 4]) {
        const result = await request(`/users?page=${page}&limit=1`, { token });
        expect(result.status).toBe(200);
        expect(result.data.pagination).toStrictEqual({ total: 3, page, limit: 1, totalPages: 3 });
        pages.push(result.data.users.map((user) => user.id));
      }
      expect(pages).toStrictEqual([[1], [first.user.id], [second.user.id], []]);
    });

    test('failed writes leave both the target and its related records unchanged', async () => {
      const { token: adminToken } = await actor('admin', 'admin');
      const { user: billed } = await seedUser('billed');
      const invoice = await Invoice.create({
        number: 'ATOMIC-001', userId: billed.id, customerName: 'Empresa Prueba SA',
        amount: '125.00', status: 'issued',
      });
      const forbidden = await request(`/users/${billed.id}/role`, {
        method: 'PATCH', token: adminToken, body: { role: 'admin' },
      });
      expect(forbidden.status).toBe(403);
      const invalid = await request(`/users/${billed.id}`, {
        method: 'PATCH', token: adminToken, body: { username: 'renamed', enabled: 'false' },
      });
      expect(invalid.status).toBe(400);
      const related = await request(`/users/${billed.id}`, { method: 'DELETE', token: adminToken });
      expect(related.status).toBe(409);
      await billed.reload();
      expect(billed.username).toBe('test_billed');
      expect(billed.role).toBe('regular');
      expect(billed.enabled).toBe(true);
      expect(await Invoice.findByPk(invoice.id)).toBeTruthy();
    });
  });
}
