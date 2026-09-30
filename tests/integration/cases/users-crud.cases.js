import { describe, expect, test } from '@jest/globals';

export function registerUserCrudCases(context) {
  const { request, actor, seedUser, userData, assertNoPassword } = context;
  describe('Usuarios y permisos admin/regular', () => {
    test('admin crea, consulta, edita, cambia roles y elimina usuarios', async () => {
      const { token } = await actor('manager');
      const created = await request('/users', {
        method: 'POST',
        token,
        body: userData('new', 'admin'),
      });
      expect(created.status).toBe(201);
      assertNoPassword(created.data);
      const id = created.data.id;
      expect((await request(`/users/${id}`, { token })).status).toBe(200);
      expect(
        (
          await request(`/users/${id}`, {
            method: 'PATCH',
            token,
            body: { username: 'updated' },
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await request(`/users/${id}/role`, {
            method: 'PATCH',
            token,
            body: { role: 'regular' },
          })
        ).data.role,
      ).toBe('regular');
      expect(
        (await request(`/users/${id}`, { method: 'DELETE', token })).status,
      ).toBe(204);
      expect((await request(`/users/${id}`, { token })).status).toBe(404);
    });
    test('regular no accede a ninguna ruta de usuarios ni clientes', async () => {
      const { token } = await actor('regular', 'regular');
      for (const [path, method] of [
        ['/users', 'GET'],
        ['/users', 'POST'],
        ['/users/1', 'GET'],
        ['/users/1', 'PATCH'],
        ['/users/1/role', 'PATCH'],
        ['/users/1', 'DELETE'],
        ['/clients', 'GET'],
        ['/clients', 'POST'],
        ['/clients/1', 'PATCH'],
        ['/clients/1', 'DELETE'],
      ]) {
        expect(
          (
            await request(path, {
              method,
              token,
              body: method === 'GET' ? undefined : {},
            })
          ).status,
        ).toBe(403);
      }
    });
    test('validación, unicidad, contraseña y roles inválidos', async () => {
      const { token } = await actor('admin');
      for (const body of [
        {},
        { ...userData('bad'), role: 'superadmin' },
        { ...userData('bad'), password: 'é'.repeat(37) },
        { ...userData('bad'), extra: true },
      ]) {
        expect(
          (await request('/users', { method: 'POST', token, body })).status,
        ).toBe(400);
      }
      const body = userData('unique');
      expect(
        (await request('/users', { method: 'POST', token, body })).status,
      ).toBe(201);
      expect(
        (await request('/users', { method: 'POST', token, body })).status,
      ).toBe(409);
      expect((await request('/users/0', { token })).status).toBe(400);
      expect(
        (
          await request('/users/999999', {
            method: 'PATCH',
            token,
            body: { username: 'x' },
          })
        ).status,
      ).toBe(404);
      expect(
        (
          await request('/users/999999/role', {
            method: 'PATCH',
            token,
            body: { role: 'admin' },
          })
        ).status,
      ).toBe(404);
      expect(
        (await request('/users/999999', { method: 'DELETE', token })).status,
      ).toBe(404);
    });
  });
}
