import { handleMalformedJsonError } from '../errors/malformed-json-error.js';
import { handleUniqueConstraintError } from '../errors/unique-constraint-error.js';

export function errorHandler(error, _req, res, _next) {
  if (handleMalformedJsonError(error, res)) {
    return;
  }

  if (handleUniqueConstraintError(error, res)) {
    return;
  }

  console.error(error);

  res.status(500).json({
    error: 'Error interno del servidor.',
  });
}