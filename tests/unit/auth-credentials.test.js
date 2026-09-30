import { expect, test } from '@jest/globals';
import bcrypt from 'bcrypt';
import { hasValidCredentials } from '../../src/modules/auth/support/auth.guards.js';

test('missing and disabled users cannot authenticate', async () => {
  await expect(hasValidCredentials(null, 'demo')).resolves.toBe(false);
  await expect(hasValidCredentials({ enabled: false }, 'demo')).resolves.toBe(false);
});

test('enabled users require a matching password', async () => {
  const user = { enabled: true, passwordHash: await bcrypt.hash('Demo123!', 4) };
  await expect(hasValidCredentials(user, 'Demo123!')).resolves.toBe(true);
  await expect(hasValidCredentials(user, 'Incorrecta')).resolves.toBe(false);
});
