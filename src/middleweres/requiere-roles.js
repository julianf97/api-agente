import { AUTH_ERROR_MESSAGES } from '../constants/constants.js';

export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.auth?.role)) {
      return res.status(403).json({
        error: AUTH_ERROR_MESSAGES.FORBIDDEN,
      });
    }

    return next();
  };
}