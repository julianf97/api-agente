import bcrypt from 'bcrypt';
import {
  createUser as createUserRepository,
  findUserById,
  updateUser as updateUserRepository,
  deleteUser as deleteUserRepository,
} from './users.repository.js';

const SALT_ROUNDS = 12;

export async function createUser({ username, email, password, role }) {
  const userData = {
    username,
    email: email.toLowerCase(),
    passwordHash: await bcrypt.hash(password, SALT_ROUNDS),
  };

  if (role !== undefined) {
    userData.role = role;
  }

  return createUserRepository(userData);
}

export async function updateUser(id, data) {
  const user = await findUserById(id);

  if (!user) {
    return null;
  }

  const { password, ...changes } = data;

  if (changes.email !== undefined) {
    changes.email = changes.email.toLowerCase();
  }

  if (password !== undefined) {
    changes.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  }

  return updateUserRepository(user, changes);
}

export async function deleteUser(id) {
  const user = await findUserById(id);

  if (!user) {
    return false;
  }

  await deleteUserRepository(user);
  return true;
}