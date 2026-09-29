import { beforeAll, describe, expect, test } from '@jest/globals';

export function registerUserValidationCases(context) {
  const { request, actor, seedUser, userData, password, assertNoPassword } = context;

  let User;
  beforeAll(() => {
    User = context.User;
  });

  describe('Entradas y permisos de usuarios', () => {
    test('read by ID allows every role and handles missing, malformed and out-of-range IDs', async () => {
      const { token: regular } = await actor('regular', 'regular');
      const { token: admin } = await actor('admin', 'admin');
      const { token: superadmin } = await actor('superadmin');
      const { user: target } = await seedUser('target', 'regular', false);
      for (const token of [regular, admin, superadmin]) {
        const response = await request(`/users/${target.id}`, { token });
        expect(response.status).toBe(200);
        expect(response.data.enabled).toBe(false);
        assertNoPassword(response.data);
      }
      for (const id of ['0', '-1', 'abc', '2147483648']) {
        expect((await request(`/users/${id}`, { token: regular })).status).toBe(400);
      }
      expect((await request('/users/999999', { token: regular })).status).toBe(404);
    });

    test('create accepts default role and allowed roles, trims username and normalizes email', async () => {
      const { token: admin } = await actor('admin', 'admin');
      const { token: superadmin } = await actor('superadmin');
      const first = await request('/users', {
        method: 'POST', token: admin,
        body: { username: '  trimmed  ', email: 'UPPER@example.com', password },
      });
      expect(first.status).toBe(201);
      expect(first.data.username).toBe('trimmed');
      expect(first.data.email).toBe('upper@example.com');
      expect(first.data.role).toBe('regular');
      expect(first.data.enabled).toBe(true);
      const second = await request('/users', {
        method: 'POST', token: superadmin,
        body: userData('new_admin', 'admin'),
      });
      expect(second.status).toBe(201);
      expect(second.data.role).toBe('admin');
      assertNoPassword(second.data);
    });

    test('create rejects every required-field, type, length, role and unknown-field category', async () => {
      const { token } = await actor('root');
      const valid = userData('candidate');
      const invalid = [
        [{ ...valid, username: undefined }, 'username'],
        [{ ...valid, username: 42 }, 'username'],
        [{ ...valid, username: '   ' }, 'username'],
        [{ ...valid, username: 'a'.repeat(256) }, 'username'],
        [{ ...valid, email: undefined }, 'email'],
        [{ ...valid, email: 42 }, 'email'],
        [{ ...valid, email: 'invalid' }, 'email'],
        [{ ...valid, email: 'a'.repeat(250) + '@x.com' }, 'email'],
        [{ ...valid, password: undefined }, 'password'],
        [{ ...valid, password: 42 }, 'password'],
        [{ ...valid, password: '    ' }, 'password'],
        [{ ...valid, password: 'é'.repeat(37) }, 'password'],
        [{ ...valid, role: 42 }, 'role'],
        [{ ...valid, role: 'superadmin' }, 'role'],
        [{ ...valid, unexpected: true }, 'unexpected'],
      ];
      for (const [body, field] of invalid) {
        const result = await request('/users', { method: 'POST', token, body });
        expect(result.status).toBe(400);
        if (!result.data.errors.some((error) => error.field === field)) {
          throw new Error(`Missing validation error for ${field}: ${JSON.stringify(result.data)}`);
        }
      }
      expect(await User.count()).toBe(1);
    });

    test('update validates ID, body fields and conflicts without modifying the target', async () => {
      const { token } = await actor('root');
      const { user } = await seedUser('target');
      const { user: existing } = await seedUser('existing');
      for (const id of ['0', '-1', 'abc', '2147483648']) {
        expect((await request(`/users/${id}`, { method: 'PATCH', token, body: { enabled: false } })).status).toBe(400);
      }
      const invalid = [
        [{}, 'body'],
        [{ username: 42 }, 'username'],
        [{ username: '  ' }, 'username'],
        [{ username: 'a'.repeat(256) }, 'username'],
        [{ email: 42 }, 'email'],
        [{ email: 'broken' }, 'email'],
        [{ email: 'a'.repeat(250) + '@x.com' }, 'email'],
        [{ password: 42 }, 'password'],
        [{ password: '  ' }, 'password'],
        [{ password: 'é'.repeat(37) }, 'password'],
        [{ enabled: 'yes' }, 'enabled'],
        [{ role: 'admin' }, 'role'],
        [{ extra: true }, 'extra'],
      ];
      for (const [body] of invalid) {
        const result = await request(`/users/${user.id}`, { method: 'PATCH', token, body });
        expect(result.status).toBe(400);
      }
      for (const body of [{ username: existing.username }, { email: existing.email }]) {
        expect((await request(`/users/${user.id}`, { method: 'PATCH', token, body })).status).toBe(409);
      }
      await user.reload();
      expect(user.username).toBe('test_target');
      expect(user.email).toBe('test_target@example.com');
      expect(user.enabled).toBe(true);
      expect((await request('/users/99999', { method: 'PATCH', token, body: { enabled: false } })).status).toBe(404);
    });

    test('update permission matrix and enabled toggle', async () => {
      const { user: root, token: superadmin } = await actor('root');
      const { user: adminUser, token: admin } = await actor('admin', 'admin');
      const { user: regularUser, token: regular } = await actor('regular', 'regular');
      const allowed = await request(`/users/${regularUser.id}`, { method: 'PATCH', token: admin, body: { enabled: false } });
      expect(allowed.status).toBe(200);
      expect(allowed.data.enabled).toBe(false);
      expect((await request('/auth/login', {
        method: 'POST', body: { email: 'test_regular@example.com', password },
      })).status).toBe(401);
      expect((await request(`/users/${regularUser.id}`, { method: 'PATCH', token: admin, body: { enabled: true } })).status).toBe(200);
      expect((await request(`/users/${adminUser.id}`, { method: 'PATCH', token: superadmin, body: { username: 'edited_admin' } })).status).toBe(200);
      expect((await request(`/users/${root.id}`, { method: 'PATCH', token: superadmin, body: { username: 'edited_root' } })).status).toBe(200);
      expect((await request(`/users/${adminUser.id}`, { method: 'PATCH', token: admin, body: { username: 'forbidden' } })).status).toBe(403);
      expect((await request(`/users/${root.id}`, { method: 'PATCH', token: admin, body: { username: 'forbidden' } })).status).toBe(403);
      expect((await request(`/users/${regularUser.id}`, { method: 'PATCH', token: regular, body: { username: 'forbidden' } })).status).toBe(403);
      expect((await request(`/users/${root.id}`, { method: 'PATCH', token: superadmin, body: { enabled: false } })).status).toBe(403);
    });

    test('role endpoint validates ID and body and covers promotion, demotion and permissions', async () => {
      const { user: root, token: superadmin } = await actor('root');
      const { user: adminUser, token: admin } = await actor('admin', 'admin');
      const { user: regularUser, token: regular } = await actor('regular', 'regular');
      for (const id of ['0', '-1', 'abc', '2147483648']) {
        expect((await request(`/users/${id}/role`, { method: 'PATCH', token: superadmin, body: { role: 'admin' } })).status).toBe(400);
      }
      for (const body of [{}, { role: 'superadmin' }, { role: 42 }, { role: 'admin', extra: true }]) {
        expect((await request(`/users/${regularUser.id}/role`, { method: 'PATCH', token: superadmin, body })).status).toBe(400);
      }
      expect((await request('/users/99999/role', { method: 'PATCH', token: superadmin, body: { role: 'admin' } })).status).toBe(404);
      expect((await request(`/users/${regularUser.id}/role`, { method: 'PATCH', token: admin, body: { role: 'admin' } })).status).toBe(403);
      expect((await request(`/users/${regularUser.id}/role`, { method: 'PATCH', token: regular, body: { role: 'admin' } })).status).toBe(403);
      expect((await request(`/users/${root.id}/role`, { method: 'PATCH', token: superadmin, body: { role: 'admin' } })).status).toBe(403);
      const promoted = await request(`/users/${regularUser.id}/role`, { method: 'PATCH', token: superadmin, body: { role: 'admin' } });
      expect(promoted.status).toBe(200);
      expect(promoted.data.role).toBe('admin');
      const demoted = await request(`/users/${adminUser.id}/role`, { method: 'PATCH', token: superadmin, body: { role: 'regular' } });
      expect(demoted.status).toBe(200);
      expect(demoted.data.role).toBe('regular');
    });

    test('delete validates IDs and covers admin/superadmin permission matrix', async () => {
      const { user: root, token: superadmin } = await actor('root');
      const { user: adminUser, token: admin } = await actor('admin', 'admin');
      const { user: regularUser, token: regular } = await actor('regular', 'regular');
      for (const id of ['0', '-1', 'abc', '2147483648']) {
        expect((await request(`/users/${id}`, { method: 'DELETE', token: superadmin })).status).toBe(400);
      }
      expect((await request('/users/99999', { method: 'DELETE', token: superadmin })).status).toBe(404);
      expect((await request(`/users/${regularUser.id}`, { method: 'DELETE', token: regular })).status).toBe(403);
      expect((await request(`/users/${adminUser.id}`, { method: 'DELETE', token: admin })).status).toBe(403);
      expect((await request(`/users/${root.id}`, { method: 'DELETE', token: superadmin })).status).toBe(403);
      expect((await request(`/users/${regularUser.id}`, { method: 'DELETE', token: admin })).status).toBe(204);
      expect((await request(`/users/${adminUser.id}`, { method: 'DELETE', token: superadmin })).status).toBe(204);
    });

    test('unexpected persistence failures return documented 500 on every endpoint', async () => {
      const originalError = console.error;
      console.error = () => {};
      try {
        async function fails(model, method, path, options) {
          const original = model[method];
          model[method] = async () => { throw new Error('Simulated database failure'); };
          try {
            const result = await request(path, options);
            expect(result.status).toBe(500);
            expect(result.data).toStrictEqual({ error: 'Error interno del servidor.' });
          } finally {
            model[method] = original;
          }
        }
        await fails(User, 'findOne', '/auth/login', { method: 'POST', body: { email: 'x@example.com', password } });
        const { token } = await actor('root');
        await fails(User, 'findAndCountAll', '/users', { token });
        await fails(User, 'create', '/users', { method: 'POST', token, body: userData('failure') });
        const originalFind = User.findByPk;
        User.findByPk = async (id, ...args) => {
          if (String(id) === '99999') throw new Error('Simulated database failure');
          return originalFind.call(User, id, ...args);
        };
        try {
          const cases = [
            ['/users/99999', { token }],
            ['/users/99999', { method: 'PATCH', token, body: { enabled: false } }],
            ['/users/99999/role', { method: 'PATCH', token, body: { role: 'admin' } }],
            ['/users/99999', { method: 'DELETE', token }],
          ];
          for (const [path, options] of cases) {
            const result = await request(path, options);
            expect(result.status).toBe(500);
            expect(result.data).toStrictEqual({ error: 'Error interno del servidor.' });
          }
        } finally {
          User.findByPk = originalFind;
        }
      } finally {
        console.error = originalError;
      }
    });



  });
}
