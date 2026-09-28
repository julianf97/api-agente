import { matchedData, validationResult } from 'express-validator';
import { REQUEST_ERROR_MESSAGES } from '../constants/constants.js';

export function handleValidation(req, res, next) {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    const errors = result.array().flatMap((error) => {
      if (error.type === 'unknown_fields') {
        return error.fields.map(({ path }) => ({
          field: path,
          message: REQUEST_ERROR_MESSAGES.UNKNOWN_FIELD,
        }));
      }

      return [{
        field: error.path || 'body',
        message: error.msg,
      }];
    });

    return res.status(400).json({ errors });
  }

  req.validatedBody = matchedData(req, { locations: ['body'] });
  return next();
}