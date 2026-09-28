import { ForeignKeyConstraintError } from 'sequelize';
import { USER_ERROR_MESSAGES } from '../constants/constants.js';

export function handleDeleteUserError(error, _req, res, next) {
  if (!(error instanceof ForeignKeyConstraintError)) {
    return next(error);
  }

  return res.status(409).json({
    error: USER_ERROR_MESSAGES.HAS_RELATED_RECORDS,
  });
}