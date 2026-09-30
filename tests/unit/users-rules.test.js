import { describe, expect, test } from '@jest/globals';
import {
  canCreateUser,
  canEditUser,
  canDeleteUser,
  canChangeUserRole,
} from '../../src/modules/users/support/users.permissions.js';
import {
  assertCanCreateUser,
  assertCanUpdateUser,
  assertCanDeleteUser,
  assertCanChangeUserRole,
} from '../../src/modules/users/support/users.guards.js';
import {
  USER_ROLES as R,
  USER_ERROR_MESSAGES as M,
} from '../../src/constants/constants.js';
import { AuthorizationError } from '../../src/errors/authorization-error.js';
import {
  hashUserPassword,
  toUserUpdateData,
} from '../../src/modules/users/support/users.mapper.js';
import { toUserResponse } from '../../src/modules/users/support/users.presenter.js';
import bcrypt from 'bcrypt';

const roles = [undefined, 'regular', 'admin', 'superadmin', 'unknown'];
describe('Reglas de usuarios', () => {
  test('solo admin administra los dos roles admitidos', () => {
    for (const actorRole of roles) {
      for (const targetRole of roles) {
        const allowed =
          actorRole === 'admin' && ['admin', 'regular'].includes(targetRole);
        expect(canCreateUser(actorRole, targetRole)).toBe(allowed);
        expect(canEditUser({ role: actorRole }, { role: targetRole })).toBe(
          allowed,
        );
        expect(canDeleteUser(actorRole, targetRole)).toBe(allowed);
        for (const newRole of roles) {
          expect(canChangeUserRole(actorRole, targetRole, newRole)).toBe(
            allowed && ['admin', 'regular'].includes(newRole),
          );
        }
      }
    }
  });

  test('guards rechazan actores sin permisos y cambios de rol fuera de su endpoint', () => {
    const admin = { role: 'admin', sub: '1' };
    const target = { id: 2, role: 'regular' };
    expect(() => assertCanUpdateUser(admin, target, { role: 'admin' })).toThrow(
      AuthorizationError,
    );
    expect(() => assertCanCreateUser({ role: 'regular' }, 'regular')).toThrow(
      AuthorizationError,
    );
    expect(() => assertCanDeleteUser(undefined, target)).toThrow(
      AuthorizationError,
    );
    expect(() => assertCanChangeUserRole(admin, target, 'superadmin')).toThrow(
      AuthorizationError,
    );
    expect(() =>
      assertCanUpdateUser(admin, target, { enabled: false }),
    ).not.toThrow();
  });

  test('mapper hashes passwords and only maps explicitly supplied update fields', async () => {
    const plain = 'new password';
    const hash = await hashUserPassword(plain);
    expect(hash).not.toBe(plain);
    expect(await bcrypt.compare(plain, hash)).toBeTruthy();
    expect(await toUserUpdateData({})).toStrictEqual({});
    const result = await toUserUpdateData({
      username: 'new',
      email: 'UPPER@EXAMPLE.COM',
      password: plain,
      enabled: false,
      role: R.ADMIN,
    });
    expect(Object.keys(result).sort()).toStrictEqual(
      ['username', 'email', 'passwordHash', 'enabled'].sort(),
    );
    expect(result.email).toBe('upper@example.com');
    expect(result.enabled).toBe(false);
    expect(await bcrypt.compare(plain, result.passwordHash)).toBeTruthy();
  });

  test('presenter strips credential and internal fields', () => {
    const source = {
      id: 1,
      username: 'someone',
      email: 'x@example.com',
      role: R.REGULAR,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordHash: 'private',
      internal: 'private',
    };
    expect(Object.keys(toUserResponse(source)).sort()).toStrictEqual(
      [
        'id',
        'username',
        'email',
        'role',
        'enabled',
        'createdAt',
        'updatedAt',
      ].sort(),
    );
  });
});
