import { USER_ERROR_MESSAGES } from '../constants/constants.js';

export function handleUserNotFound(value, res) {
  if (value) {
    return false;
  }

  res.status(404).json({
    error: USER_ERROR_MESSAGES.USER_NOT_FOUND,
  });

  return true;
}