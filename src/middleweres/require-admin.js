import {
  AUTH_ERROR_MESSAGES,
  USER_ROLES,
} from '../constants/constants.js';

export function requireAdmin(req, res, next) {
  if (req.auth?.role !== USER_ROLES.ADMIN) {
    return res.status(403).json({
      error: AUTH_ERROR_MESSAGES.ADMIN_REQUIRED,
    });
  }

  return next();
}