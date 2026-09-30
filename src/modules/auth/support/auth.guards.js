import bcrypt from 'bcrypt';

export async function hasValidCredentials(user, password) {
  if (!user || !user.enabled) return false;
  return bcrypt.compare(password, user.passwordHash);
}
