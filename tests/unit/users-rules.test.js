import { describe, expect, test } from '@jest/globals';
import {
  canCreateUser, canEditUser, canDeleteUser, canChangeUserRole,
} from '../../src/modules/users/users.permissions.js';
import {
  assertCanCreateUser, assertCanUpdateUser, assertCanDeleteUser, assertCanChangeUserRole,
} from '../../src/modules/users/users.guards.js';
import { USER_ROLES as R, USER_ERROR_MESSAGES as M } from '../../src/constants/constants.js';
import { AuthorizationError } from '../../src/errors/authorization-error.js';
import { hashUserPassword, toUserUpdateData } from '../../src/modules/users/users.mapper.js';
import { toUserResponse } from '../../src/modules/users/users.presenter.js';
import bcrypt from 'bcrypt';

const roles = [undefined, R.REGULAR, R.ADMIN, R.SUPERADMIN];

function forbidden(action, message) {
  expect(action).toThrow(AuthorizationError);
  expect(action).toThrow(message);
}

describe('Reglas de usuarios', () => {
  test('create permission matrix rejects every unassignable role and actor', () => {
    for (const actorRole of roles) {
      for (const newRole of [...roles, 'unknown']) {
        const allowed =
          (actorRole === R.SUPERADMIN && [R.REGULAR, R.ADMIN].includes(newRole)) ||
          (actorRole === R.ADMIN && newRole === R.REGULAR);
        expect(canCreateUser(actorRole, newRole)).toBe(allowed);
        const action = () => assertCanCreateUser({ role: actorRole }, newRole);
        if (allowed) expect(action).not.toThrow();
        else forbidden(action, M.CANNOT_CREATE_WITH_ROLE);
      }
    }
    forbidden(() => assertCanCreateUser(undefined, R.REGULAR), M.CANNOT_CREATE_WITH_ROLE);
  });

  test('edit permission matrix includes self-only superadmin and guard defenses', () => {
    for (const actorRole of roles) {
      for (const targetRole of [R.REGULAR, R.ADMIN, R.SUPERADMIN]) {
        for (const sameAccount of [false, true]) {
          const actor = { role: actorRole, sub: '1' };
          const user = { role: targetRole, id: sameAccount ? 1 : 2 };
          const allowed =
            actorRole === R.SUPERADMIN && (targetRole !== R.SUPERADMIN || sameAccount) ||
            actorRole === R.ADMIN && targetRole === R.REGULAR;
          expect(canEditUser(actor, user)).toBe(allowed);
          const action = () => assertCanUpdateUser(actor, user, { username: 'new' });
          if (allowed) expect(action).not.toThrow();
          else forbidden(action, M.CANNOT_EDIT);
        }
      }
    }
    const self = { role: R.SUPERADMIN, sub: '1' };
    const root = { id: 1, role: R.SUPERADMIN };
    forbidden(() => assertCanUpdateUser(self, root, { role: R.ADMIN }), M.CANNOT_CHANGE_ROLE_HERE);
    forbidden(() => assertCanUpdateUser(self, root, { enabled: false }), M.CANNOT_DISABLE_SUPERADMIN);
    expect(() => assertCanUpdateUser(self, root, { enabled: true })).not.toThrow();
    expect(canEditUser(undefined, root)).toBe(false);
  });

  test('delete permission matrix blocks superadmin targets', () => {
    for (const actorRole of roles) {
      for (const targetRole of [R.REGULAR, R.ADMIN, R.SUPERADMIN]) {
        const allowed = targetRole !== R.SUPERADMIN && (
          actorRole === R.SUPERADMIN || actorRole === R.ADMIN && targetRole === R.REGULAR
        );
        expect(canDeleteUser(actorRole, targetRole)).toBe(allowed);
        const action = () => assertCanDeleteUser({ role: actorRole }, { role: targetRole });
        if (allowed) expect(action).not.toThrow();
        else forbidden(action, M.CANNOT_DELETE);
      }
    }
    forbidden(() => assertCanDeleteUser(undefined, { role: R.REGULAR }), M.CANNOT_DELETE);
  });

  test('role-change permission matrix covers actor, target and destination', () => {
    for (const actorRole of roles) {
      for (const targetRole of [R.REGULAR, R.ADMIN, R.SUPERADMIN]) {
        for (const newRole of [...roles, 'unknown']) {
          const allowed = actorRole === R.SUPERADMIN && targetRole !== R.SUPERADMIN &&
            [R.REGULAR, R.ADMIN].includes(newRole);
          expect(canChangeUserRole(actorRole, targetRole, newRole)).toBe(allowed);
          const action = () => assertCanChangeUserRole({ role: actorRole }, { role: targetRole }, newRole);
          if (allowed) expect(action).not.toThrow();
          else forbidden(action, M.CANNOT_CHANGE_ROLE);
        }
      }
    }
    forbidden(() => assertCanChangeUserRole(undefined, { role: R.REGULAR }, R.ADMIN), M.CANNOT_CHANGE_ROLE);
  });

  test('mapper hashes passwords and only maps explicitly supplied update fields', async () => {
    const plain = 'new password';
    const hash = await hashUserPassword(plain);
    expect(hash).not.toBe(plain);
    expect(await bcrypt.compare(plain, hash)).toBeTruthy();
    expect(await toUserUpdateData({})).toStrictEqual({});
    const result = await toUserUpdateData({
      username: 'new', email: 'UPPER@EXAMPLE.COM', password: plain, enabled: false, role: R.ADMIN,
    });
    expect(Object.keys(result).sort()).toStrictEqual(['username', 'email', 'passwordHash', 'enabled'].sort());
    expect(result.email).toBe('upper@example.com');
    expect(result.enabled).toBe(false);
    expect(await bcrypt.compare(plain, result.passwordHash)).toBeTruthy();
  });

  test('presenter strips credential and internal fields', () => {
    const source = {
      id: 1, username: 'someone', email: 'x@example.com', role: R.REGULAR, enabled: true,
      createdAt: new Date(), updatedAt: new Date(), passwordHash: 'private', internal: 'private',
    };
    expect(Object.keys(toUserResponse(source)).sort()).toStrictEqual([
      'id', 'username', 'email', 'role', 'enabled', 'createdAt', 'updatedAt',
    ].sort());
  });
});
