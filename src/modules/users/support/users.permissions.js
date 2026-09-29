import { USER_ROLES } from '../../../constants/constants.js';

export function canCreateUser(actorRole, newUserRole) {
  if (![USER_ROLES.REGULAR, USER_ROLES.ADMIN].includes(newUserRole)) {
    return false;
  }

  if (actorRole === USER_ROLES.SUPERADMIN) {
    return true;
  }

  return (
    actorRole === USER_ROLES.ADMIN &&
    newUserRole === USER_ROLES.REGULAR
  );
}

export function canEditUser(actor, targetUser) {
  if (actor?.role === USER_ROLES.SUPERADMIN) {
    if (targetUser.role === USER_ROLES.SUPERADMIN) {
      return String(actor.sub) === String(targetUser.id);
    }

    return [USER_ROLES.REGULAR, USER_ROLES.ADMIN].includes(
      targetUser.role,
    );
  }

  return (
    actor?.role === USER_ROLES.ADMIN &&
    targetUser.role === USER_ROLES.REGULAR
  );
}

export function canDeleteUser(actorRole, targetRole) {
  if (targetRole === USER_ROLES.SUPERADMIN) {
    return false;
  }

  if (actorRole === USER_ROLES.SUPERADMIN) {
    return [USER_ROLES.REGULAR, USER_ROLES.ADMIN].includes(targetRole);
  }

  return (
    actorRole === USER_ROLES.ADMIN &&
    targetRole === USER_ROLES.REGULAR
  );
}

export function canChangeUserRole(actorRole, targetRole, newRole) {
  return (
    actorRole === USER_ROLES.SUPERADMIN &&
    targetRole !== USER_ROLES.SUPERADMIN &&
    [USER_ROLES.REGULAR, USER_ROLES.ADMIN].includes(newRole)
  );
}