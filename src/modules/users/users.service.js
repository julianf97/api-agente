import bcrypt from 'bcrypt';
import { createUser as createUserRepository } from './users.repository.js';

const SALT_ROUNDS = 12;

export async function createUser({ username, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const userData = {
    username,
    email: email.toLowerCase(),
    passwordHash,
  };

  if (role !== undefined) {
    userData.role = role;
  }

  return createUserRepository(userData);
}