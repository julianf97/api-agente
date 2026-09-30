import jwt from 'jsonwebtoken';
import { jwtSecret } from '../../../config/jwt.js';

export function toLoginResponse(user) {
  return {
    accessToken: jwt.sign({ role: user.role }, jwtSecret, {
      subject: String(user.id),
      expiresIn: '1h',
      algorithm: 'HS256',
    }),
    tokenType: 'Bearer',
    expiresIn: 3600,
  };
}
