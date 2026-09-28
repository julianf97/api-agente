import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../../config/jwt.js';
import { findUserByEmail } from './auth.repository.js';

export async function login({ email, password }) {
  const user = await findUserByEmail(email.toLowerCase());

  if (!user || !user.enabled) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    return null;
  }

  const accessToken = jwt.sign(
    { role: user.role },
    jwtSecret,
    {
      subject: String(user.id),
      expiresIn: '1h',
      algorithm: 'HS256',
    },
  );

  return {
    accessToken,
    tokenType: 'Bearer',
    expiresIn: 3600,
  };
}