import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function hashUserPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function toUserUpdateData(data) {
  const changes = {};

  if (data.username !== undefined) {
    changes.username = data.username;
  }

  if (data.email !== undefined) {
    changes.email = data.email.toLowerCase();
  }

  if (data.password !== undefined) {
    changes.passwordHash = await hashUserPassword(data.password);
  }

  if (data.enabled !== undefined) {
    changes.enabled = data.enabled;
  }

  return changes;
}