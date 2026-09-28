import { UserNotFoundError } from '../../errors/user-not-found-error.js';
import { findUserById } from './users.repository.js';

export async function findExistingUserById(id) {
  const user = await findUserById(id);

  if (!user) {
    throw new UserNotFoundError();
  }

  return user;
}