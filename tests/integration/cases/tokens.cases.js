import { describe, expect, test } from '@jest/globals';

export function registerTokenCases(context) {
  const { request, actor, seedUser, password, assertNoPassword } = context;

  describe('Validación y tokens', () => {
    test('login validates each field and rejects unexpected input without leaking passwords', async () => {
      const cases = [
        [{ password }, 'email'],
        [{ email: 'test@example.com' }, 'password'],
        [{ email: 42, password }, 'email'],
        [{ email: 'invalid', password }, 'email'],
        [{ email: '', password }, 'email'],
        [{ email: 'test@example.com', password: 42 }, 'password'],
        [{ email: 'test@example.com', password: '' }, 'password'],
        [{ email: 'test@example.com', password, extra: 'x' }, 'extra'],
      ];
      for (const [body, field] of cases) {
        const response = await request('/auth/login', { method: 'POST', body });
        expect(response.status).toBe(400);
        if (!response.data.errors.some((error) => error.field === field)) {
          throw new Error(`Missing validation error for ${field}: ${JSON.stringify(response.data)}`);
        }
        expect(JSON.stringify(response.data)).not.toMatch(/StrongPass123!/);
      }
    });

    test('tokens reject malformed, expired, wrong signature and deleted account', async () => {
      const jwt = (await import('jsonwebtoken')).default;
      const { user, token } = await actor('auth');
      const cases = [
        { headers: { Authorization: `Basic ${token}` } },
        { token: 'malformed.token' },
        { token: jwt.sign({ role: 'superadmin' }, 'wrong-secret', { subject: String(user.id) }) },
        { token: jwt.sign({ role: 'superadmin' }, process.env.JWT_SECRET, { subject: String(user.id), expiresIn: -1 }) },
        { token: jwt.sign({ role: 'superadmin' }, process.env.JWT_SECRET, { subject: 'invalid' }) },
      ];
      for (const options of cases) {
        expect((await request('/users', options)).status).toBe(401);
      }
      await user.destroy();
      expect((await request('/users', { token })).status).toBe(401);
    });

    test('list includes disabled users, supports default and boundary pagination, rejects invalid query', async () => {
      const { token } = await actor('reader', 'regular');
      const { user: disabled } = await seedUser('disabled', 'regular', false);
      const defaults = await request('/users', { token });
      expect(defaults.status).toBe(200);
      expect(defaults.data.pagination.page).toBe(1);
      expect(defaults.data.pagination.limit).toBe(20);
      expect(defaults.data.users.some((user) => user.id === disabled.id && user.enabled === false)).toBeTruthy();
      for (const query of ['page=1&limit=100', 'page=100&limit=1']) {
        const response = await request(`/users?${query}`, { token });
        expect(response.status).toBe(200);
        assertNoPassword(response.data);
      }
      const empty = await request('/users?page=100&limit=1', { token });
      expect(empty.data.users).toStrictEqual([]);
      for (const query of ['page=0', 'page=-1', 'page=foo', 'limit=0', 'limit=101', 'limit=foo', 'extra=1']) {
        const response = await request(`/users?${query}`, { token });
        expect(response.status).toBe(400);
      }
    });

  });
}
