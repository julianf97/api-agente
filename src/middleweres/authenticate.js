import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/jwt.js';

export function authenticate(req, res, next) {
  const authorization = req.get('Authorization');
  const match = /^Bearer (.+)$/i.exec(authorization ?? '');

  if (!match) {
    return res.status(401).json({
      error: 'Token de autenticación requerido.',
    });
  }

  try {
    const payload = jwt.verify(match[1], jwtSecret, {
      algorithms: ['HS256'],
    });

    if (typeof payload !== 'object' || !payload.sub) {
      return res.status(401).json({
        error: 'Token inválido.',
      });
    }

    req.auth = payload;
    return next();
  } catch {
    return res.status(401).json({
      error: 'Token inválido o expirado.',
    });
  }
}