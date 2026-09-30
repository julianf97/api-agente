import { USER_ROLES } from '../../../constants/constants.js';

const validRole = (role) => Object.values(USER_ROLES).includes(role);

export function canCreateUser(actorRole, newRole) {
  return actorRole === USER_ROLES.ADMIN && validRole(newRole);
}

export function canEditUser(actor, target) {
  return actor?.role === USER_ROLES.ADMIN && validRole(target.role);
}

export function canDeleteUser(actorRole, targetRole) {
  return actorRole === USER_ROLES.ADMIN && validRole(targetRole);
}

export function canChangeUserRole(actorRole, targetRole, newRole) {
  return canDeleteUser(actorRole, targetRole) && validRole(newRole);
}
