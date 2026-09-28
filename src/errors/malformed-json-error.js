import { REQUEST_ERROR_MESSAGES } from '../constants/constants.js';

export function handleMalformedJsonError(error, res) {
  if (!(error instanceof SyntaxError && error.status === 400 && 'body' in error)) {
    return false;
  }

  res.status(400).json({
    errors: [
      { field: 'body', message: REQUEST_ERROR_MESSAGES.MALFORMED_JSON, },
    ],
  });

  return true;
}