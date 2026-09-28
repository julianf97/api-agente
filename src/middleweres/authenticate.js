import jwt from 'jsonwebtoken';
import { AUTH_ERROR_MESSAGES } from '../constants/constants.js';
import { jwtSecret } from '../config/jwt.js';
import { findUserById } from '../modules/users/users.repository.js';

export async function authenticate(req, res, next) {
  const authorization = req.get('Authorization');
  const match = /^Bearer (.+)$/i.exec(authorization ?? '');

  if (!match) {
    return res.status(401).json({
      error: AUTH_ERROR_MESSAGES.TOKEN_REQUIRED,
    });
  }

  let payload;

  try {
    payload = jwt.verify(match[1], jwtSecret, {
      algorithms: ['HS256'],
    });
  } catch {
    return res.status(401).json({
      error: AUTH_ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN,
    });
  }

  if (
    typeof payload !== 'object' ||
    typeof payload.sub !== 'string' ||
    !/^[1-9]\d*$/.test(payload.sub)
  ) {
    return res.status(401).json({
      error: AUTH_ERROR_MESSAGES.INVALID_TOKEN,
    });
  }

  try {
    const user = await findUserById(payload.sub);

    if (!user || !user.enabled) {
      return res.status(401).json({
        error: AUTH_ERROR_MESSAGES.USER_UNAVAILABLE,
      });
    }

    req.auth = {
      sub: String(user.id),
      role: user.role,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}