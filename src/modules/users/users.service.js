import bcrypt from 'bcrypt';
import { USER_ERROR_MESSAGES, USER_ROLES } from '../../constants/constants.js';
import { AuthorizationError } from '../../errors/authorization-error.js';
import {
  createUser as createUserRepository,
  findUsers,
  findUserById,
  updateUser as updateUserRepository,
  deleteUser as deleteUserRepository,
} from './users.repository.js';
import {
  canCreateUser,
  canEditUser,
  canDeleteUser,
  canChangeUserRole,
} from './users.permissions.js';

const SALT_ROUNDS = 12;

export async function createUser(
  { username, email, password, role = USER_ROLES.REGULAR },
  actor,
) {
  if (!canCreateUser(actor?.role, role)) {
    throw new AuthorizationError(
      USER_ERROR_MESSAGES.CANNOT_CREATE_WITH_ROLE,
    );
  }

  return createUserRepository({
    username,
    email: email.toLowerCase(),
    passwordHash: await bcrypt.hash(password, SALT_ROUNDS),
    role,
  });
}

export async function listUsers({ page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  const { rows, count } = await findUsers({ limit, offset });

  return {
    users: rows,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  };
}

export async function getUserById(id) {
  return findUserById(id);
}

export async function updateUser(id, data, actor) {
  const user = await findUserById(id);

  if (!user) {
    return null;
  }

  if (!canEditUser(actor, user)) {
    throw new AuthorizationError(USER_ERROR_MESSAGES.CANNOT_EDIT);
  }

  if (Object.hasOwn(data, 'role')) {
    throw new AuthorizationError(
      USER_ERROR_MESSAGES.CANNOT_CHANGE_ROLE_HERE,
    );
  }

  const changes = {};

  if (data.username !== undefined) {
    changes.username = data.username;
  }

  if (data.email !== undefined) {
    changes.email = data.email.toLowerCase();
  }

  if (data.password !== undefined) {
    changes.passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  }

  return updateUserRepository(user, changes);
}

export async function changeUserRole(id, newRole, actor) {
  const user = await findUserById(id);

  if (!user) {
    return null;
  }

  if (!canChangeUserRole(actor?.role, user.role, newRole)) {
    throw new AuthorizationError(
      USER_ERROR_MESSAGES.CANNOT_CHANGE_ROLE,
    );
  }

  return updateUserRepository(user, { role: newRole });
}

export async function deleteUser(id, actor) {
  const user = await findUserById(id);

  if (!user) {
    return false;
  }

  if (!canDeleteUser(actor?.role, user.role)) {
    throw new AuthorizationError(USER_ERROR_MESSAGES.CANNOT_DELETE);
  }

  await deleteUserRepository(user);
  return true;
}