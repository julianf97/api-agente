import { USER_ERROR_MESSAGES } from '../constants/constants.js';

export class UserNotFoundError extends Error {
  constructor() {
    super(USER_ERROR_MESSAGES.USER_NOT_FOUND);
    this.name = 'UserNotFoundError';
  }
}

export function handleUserNotFoundError(error, res) {
  if (!(error instanceof UserNotFoundError)) {
    return false;
  }

  res.status(404).json({
    error: error.message,
  });

  return true;
}