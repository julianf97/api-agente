import { findUserByEmail } from './auth.repository.js';
import { hasValidCredentials } from './support/auth.guards.js';
import { toLoginResponse } from './support/auth.mapper.js';

export async function login({ email, password }) {
  const user = await findUserByEmail(email.toLowerCase());
  if (!(await hasValidCredentials(user, password))) return null;
  return toLoginResponse(user);
}
