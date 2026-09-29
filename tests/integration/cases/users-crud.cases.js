import { beforeAll, describe, expect, test } from '@jest/globals';
import bcrypt from 'bcrypt';

export function registerUserCrudCases(context) {
  const { request, actor, seedUser, login, userData, password, assertNoPassword } = context;

  let User;
  let Invoice;
  beforeAll(() => {
    User = context.User;
    Invoice = context.Invoice;
  });

  describe('CRUD de usuarios', () => {
    test('superadmin creates a user, persists a bcrypt hash, reads and paginates without exposing it', async () => {
      const { token } = await actor('owner');
      const data = userData('created');
      const created = await request('/users', { method: 'POST', token, body: data });
      expect(created.status).toBe(201);
      expect(created.data.email).toBe(data.email);
      assertNoPassword(created.data);
      const row = await User.findByPk(created.data.id);
      expect(row.passwordHash).not.toBe(password);
      expect(await bcrypt.compare(password, row.passwordHash)).toBeTruthy();
      const found = await request(`/users/${row.id}`, { token });
      expect(found.status).toBe(200);
      assertNoPassword(found.data);
      const listed = await request('/users?page=2&limit=1', { token });
      expect(listed.status).toBe(200);
      expect(listed.data.pagination.total).toBe(2);
      expect(listed.data.pagination.page).toBe(2);
      expect(listed.data.users.length).toBe(1);
      assertNoPassword(listed.data);
      expect((await request('/users?page=0', { token })).status).toBe(400);
      expect((await request('/users/0', { token })).status).toBe(400);
      expect((await request('/users/9999', { token })).status).toBe(404);
    });

    test('creation validates fields, rejects duplicates and enforces role hierarchy', async () => {
      const { token: superToken } = await actor('root');
      const { token: adminToken } = await actor('admin', 'admin');
      const { token: regularToken } = await actor('reader', 'regular');
      const data = userData('new');
      expect((await request('/users', { method: 'POST', token: regularToken, body: data })).status).toBe(403);
      expect((await request('/users', {
        method: 'POST', token: adminToken, body: { ...data, role: 'admin' },
      })).status).toBe(403);
      expect((await request('/users', {
        method: 'POST', token: superToken, body: { ...data, role: 'superadmin' },
      })).status).toBe(400);
      expect((await request('/users', {
        method: 'POST', token: adminToken, body: { ...data, extra: true },
      })).status).toBe(400);
      expect((await request('/users', {
        method: 'POST', token: adminToken, body: { ...data, password: ' '.repeat(4) },
      })).status).toBe(400);
      expect((await request('/users', { method: 'POST', token: adminToken, body: data })).status).toBe(201);
      expect((await request('/users', {
        method: 'POST', token: adminToken, body: { ...data, email: 'different@example.com' },
      })).status).toBe(409);
      expect((await request('/users', {
        method: 'POST', token: adminToken, body: { ...data, username: 'different' },
      })).status).toBe(409);
    });

    test('update changes fields and password; role changes use the dedicated superadmin route', async () => {
      const { token } = await actor('root');
      const { user, data } = await seedUser('target');
      const updated = await request(`/users/${user.id}`, {
        method: 'PATCH', token,
        body: { username: 'renamed', email: 'RENAMED@example.com', password: 'NewPassword123!' },
      });
      expect(updated.status).toBe(200);
      expect(updated.data.email).toBe('renamed@example.com');
      assertNoPassword(updated.data);
      await user.reload();
      expect(await bcrypt.compare('NewPassword123!', user.passwordHash)).toBeTruthy();
      expect((await request('/auth/login', {
        method: 'POST', body: { email: data.email, password },
      })).status).toBe(401);
      expect((await request('/users/99999', {
        method: 'PATCH', token, body: { username: 'absent' },
      })).status).toBe(404);
      expect((await request(`/users/${user.id}`, {
        method: 'PATCH', token, body: { role: 'admin' },
      })).status).toBe(400);
      expect((await request(`/users/${user.id}`, {
        method: 'PATCH', token, body: {},
      })).status).toBe(400);
      const promoted = await request(`/users/${user.id}/role`, {
        method: 'PATCH', token, body: { role: 'admin' },
      });
      expect(promoted.status).toBe(200);
      expect(promoted.data.role).toBe('admin');
      expect((await request(`/users/${user.id}/role`, {
        method: 'PATCH', token, body: { role: 'superadmin' },
      })).status).toBe(400);
    });

    test('regular users cannot mutate; admin cannot edit admin; superadmin cannot be disabled or deleted', async () => {
      const { user: root, token: superToken } = await actor('root');
      const { user: admin, token: adminToken } = await actor('admin', 'admin');
      const { user: regular, token: regularToken } = await actor('regular', 'regular');
      expect((await request(`/users/${regular.id}`, {
        method: 'PATCH', token: regularToken, body: { username: 'bad' },
      })).status).toBe(403);
      expect((await request(`/users/${admin.id}`, {
        method: 'PATCH', token: adminToken, body: { username: 'bad' },
      })).status).toBe(403);
      expect((await request(`/users/${regular.id}/role`, {
        method: 'PATCH', token: adminToken, body: { role: 'admin' },
      })).status).toBe(403);
      expect((await request(`/users/${root.id}`, {
        method: 'PATCH', token: superToken, body: { enabled: false },
      })).status).toBe(403);
      expect((await request(`/users/${root.id}`, {
        method: 'DELETE', token: superToken,
      })).status).toBe(403);
    });

    test('delete removes a user and refuses one with related invoices', async () => {
      const { token } = await actor('root');
      const { user } = await seedUser('removable');
      expect((await request(`/users/${user.id}`, { method: 'DELETE', token })).status).toBe(204);
      expect(await User.findByPk(user.id)).toBe(null);
      expect((await request(`/users/${user.id}`, { method: 'DELETE', token })).status).toBe(404);
      const { user: billed } = await seedUser('billed');
      await Invoice.create({
        number: 'TEST-001', userId: billed.id, customerName: 'Empresa Prueba SA',
        amount: '125.00', status: 'issued',
      });
      const blocked = await request(`/users/${billed.id}`, { method: 'DELETE', token });
      expect(blocked.status).toBe(409);
      expect(await User.findByPk(billed.id)).toBeTruthy();
    });

  });
}
