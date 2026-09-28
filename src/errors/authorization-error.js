import { AUTH_ERROR_MESSAGES } from '../constants/constants.js';

export class AuthorizationError extends Error {
  constructor(message = AUTH_ERROR_MESSAGES.FORBIDDEN) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export function handleAuthorizationError(error, res) {
  if (!(error instanceof AuthorizationError)) {
    return false;
  }

  res.status(403).json({
    error: error.message,
  });

  return true;
}