import { describe, expect, test } from '@jest/globals';

export function registerAuthCases(context) {
  const { request, actor, seedUser, login, password, assertNoPassword } =
    context;

  describe('Autenticación y documentación', () => {
    test('Swagger UI is served and login validation rejects malformed input', async () => {
      const docs = await request('/api-docs/');
      expect(docs.status).toBe(200);
      expect(docs.data).toMatch(/swagger-ui/i);
      const missing = await request('/auth/login', {
        method: 'POST',
        body: {},
      });
      expect(missing.status).toBe(400);
      expect(
        missing.data.errors.some((error) => error.field === 'email'),
      ).toBeTruthy();
      const unknown = await request('/auth/login', {
        method: 'POST',
        body: { email: 'a@example.com', password, extra: true },
      });
      expect(unknown.status).toBe(400);
      const malformed = await request('/auth/login', {
        method: 'POST',
        rawBody: '{',
      });
      expect(malformed.status).toBe(400);
    });

    test('login verifies password, normalizes email and refuses disabled users', async () => {
      const { user, data } = await seedUser('login');
      const token = await login({ ...data, email: data.email.toUpperCase() });
      expect((await request('/users', { token })).status).toBe(403);
      expect(
        (
          await request('/auth/login', {
            method: 'POST',
            body: { email: data.email, password: 'wrong' },
          })
        ).status,
      ).toBe(401);
      expect(
        (
          await request('/auth/login', {
            method: 'POST',
            body: { email: 'missing@example.com', password },
          })
        ).status,
      ).toBe(401);
      await user.update({ enabled: false });
      expect(
        (
          await request('/auth/login', {
            method: 'POST',
            body: { email: data.email, password },
          })
        ).status,
      ).toBe(401);
      expect((await request('/users', { token })).status).toBe(401);
    });

    test('every users route requires a valid active bearer token', async () => {
      const routes = [
        ['/users', 'GET'],
        ['/users/1', 'GET'],
        ['/users', 'POST'],
        ['/users/1', 'PATCH'],
        ['/users/1/role', 'PATCH'],
        ['/users/1', 'DELETE'],
      ];
      for (const [path, method] of routes) {
        expect((await request(path, { method })).status).toBe(401);
        expect((await request(path, { method, token: 'invalid' })).status).toBe(
          401,
        );
      }
    });
  });
}
