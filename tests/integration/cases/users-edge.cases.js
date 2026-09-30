import { beforeAll, describe, expect, test } from '@jest/globals';
import bcrypt from 'bcrypt';

export function registerUserEdgeCases(context) {
  const { request, actor, seedUser, userData, password } = context;

  let User;
  beforeAll(() => {
    User = context.User;
  });

  describe('Errores y casos límite', () => {
    test('every write route handles malformed JSON, unknown properties and invalid content types', async () => {
      const { user, token } = await actor('root');
      const routes = [
        ['/users', userData('input')],
        [`/users/${user.id}`, { username: 'changed' }],
        [`/users/${user.id}/role`, { role: 'admin' }],
      ];
      for (const [path, validBody] of routes) {
        const malformed = await request(path, {
          method: path === '/users' ? 'POST' : 'PATCH',
          token,
          rawBody: '{',
        });
        expect(malformed.status).toBe(400);
        expect(
          malformed.data.errors.some((error) => error.field === 'body'),
        ).toBeTruthy();
        const unknown = await request(path, {
          method: path === '/users' ? 'POST' : 'PATCH',
          token,
          body: { ...validBody, unexpected: 'ignored?' },
        });
        expect(unknown.status).toBe(400);
        expect(
          unknown.data.errors.some((error) => error.field === 'unexpected'),
        ).toBeTruthy();
        const wrongType = await request(path, {
          method: path === '/users' ? 'POST' : 'PATCH',
          token,
          rawBody: JSON.stringify(validBody),
          headers: { 'Content-Type': 'text/plain' },
        });
        expect(wrongType.status).toBe(400);
      }
    });

    test('user creation and update exercise accepted boundaries and case-insensitive email uniqueness', async () => {
      const { token } = await actor('root');
      const maxPassword = 'a'.repeat(72);
      const maxUsername = 'u'.repeat(255);
      const created = await request('/users', {
        method: 'POST',
        token,
        body: {
          username: maxUsername,
          email: 'boundary@example.com',
          password: maxPassword,
        },
      });
      expect(created.status).toBe(201);
      expect(created.data.username.length).toBe(255);
      expect(
        await bcrypt.compare(
          maxPassword,
          (await User.findByPk(created.data.id)).passwordHash,
        ),
      ).toBeTruthy();
      const sameEmail = await request('/users', {
        method: 'POST',
        token,
        body: { ...userData('duplicate'), email: 'BOUNDARY@example.com' },
      });
      expect(sameEmail.status).toBe(409);
      const updated = await request(`/users/${created.data.id}`, {
        method: 'PATCH',
        token,
        body: { password: maxPassword, username: 'u'.repeat(255) },
      });
      expect(updated.status).toBe(200);
      expect(updated.data.username.length).toBe(255);
    });

    test('a disabled actor gets 401 for every protected endpoint, including writes', async () => {
      const { user, token } = await actor('admin', 'admin');
      const { user: target } = await seedUser('target');
      await user.update({ enabled: false });
      const cases = [
        ['/users', { token }],
        [`/users/${target.id}`, { token }],
        ['/users', { method: 'POST', token, body: userData('new') }],
        [
          `/users/${target.id}`,
          { method: 'PATCH', token, body: { enabled: false } },
        ],
        [
          `/users/${target.id}/role`,
          { method: 'PATCH', token, body: { role: 'admin' } },
        ],
        [`/users/${target.id}`, { method: 'DELETE', token }],
      ];
      for (const [path, options] of cases) {
        expect((await request(path, options)).status).toBe(401);
      }
      expect(await User.findByPk(target.id)).toBeTruthy();
    });
  });
}
