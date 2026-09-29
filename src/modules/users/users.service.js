import { USER_ROLES } from '../../constants/constants.js';
import {
  createUser as createUserRepository,
  findUsers,
  updateUser as updateUserRepository,
  deleteUser as deleteUserRepository,
} from './users.repository.js';
import { findExistingUserById } from './support/find-existing-user.js';
import {
  assertCanCreateUser,
  assertCanUpdateUser,
  assertCanChangeUserRole,
  assertCanDeleteUser,
} from './support/users.guards.js';
import {
  hashUserPassword,
  toUserUpdateData,
} from './support/users.mapper.js';

export async function createUser(
  { username, email, password, role = USER_ROLES.REGULAR },
  actor,
) {
  assertCanCreateUser(actor, role);

  return createUserRepository({
    username,
    email: email.toLowerCase(),
    passwordHash: await hashUserPassword(password),
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
  return findExistingUserById(id);
}

export async function updateUser(id, data, actor) {
  const user = await findExistingUserById(id);

  assertCanUpdateUser(actor, user, data);

  const changes = await toUserUpdateData(data);
  return updateUserRepository(user, changes);
}

export async function changeUserRole(id, newRole, actor) {
  const user = await findExistingUserById(id);

  assertCanChangeUserRole(actor, user, newRole);

  return updateUserRepository(user, { role: newRole });
}

export async function deleteUser(id, actor) {
  const user = await findExistingUserById(id);

  assertCanDeleteUser(actor, user);

  await deleteUserRepository(user);
  return true;
}