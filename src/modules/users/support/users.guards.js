import { USER_ERROR_MESSAGES, USER_ROLES } from '../../../constants/constants.js';
import { AuthorizationError } from '../../../errors/authorization-error.js';
import {
  canCreateUser,
  canEditUser,
  canDeleteUser,
  canChangeUserRole,
} from './users.permissions.js';

export function assertCanCreateUser(actor, newUserRole) {
  if (!canCreateUser(actor?.role, newUserRole)) {
    throw new AuthorizationError(
      USER_ERROR_MESSAGES.CANNOT_CREATE_WITH_ROLE,
    );
  }
}

export function assertCanUpdateUser(actor, user, data) {
  if (!canEditUser(actor, user)) {
    throw new AuthorizationError(USER_ERROR_MESSAGES.CANNOT_EDIT);
  }

  if (Object.hasOwn(data, 'role')) {
    throw new AuthorizationError(
      USER_ERROR_MESSAGES.CANNOT_CHANGE_ROLE_HERE,
    );
  }

  if (
    user.role === USER_ROLES.SUPERADMIN &&
    data.enabled === false
  ) {
    throw new AuthorizationError(
      USER_ERROR_MESSAGES.CANNOT_DISABLE_SUPERADMIN,
    );
  }
}

export function assertCanChangeUserRole(actor, user, newRole) {
  if (!canChangeUserRole(actor?.role, user.role, newRole)) {
    throw new AuthorizationError(
      USER_ERROR_MESSAGES.CANNOT_CHANGE_ROLE,
    );
  }
}

export function assertCanDeleteUser(actor, user) {
  if (!canDeleteUser(actor?.role, user.role)) {
    throw new AuthorizationError(USER_ERROR_MESSAGES.CANNOT_DELETE);
  }
}