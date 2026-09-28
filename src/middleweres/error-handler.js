import { REQUEST_ERROR_MESSAGES } from '../constants/constants.js';
import { handleAuthorizationError } from '../errors/authorization-error.js';
import { handleMalformedJsonError } from '../errors/malformed-json-error.js';
import { handleUniqueConstraintError } from '../errors/unique-constraint-error.js';

export function errorHandler(error, _req, res, _next) {
  if (handleAuthorizationError(error, res)) {
    return;
  }

  if (handleMalformedJsonError(error, res)) {
    return;
  }

  if (handleUniqueConstraintError(error, res)) {
    return;
  }

  console.error(error);

  res.status(500).json({
    error: REQUEST_ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
  });
}