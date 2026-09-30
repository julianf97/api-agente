import { UniqueConstraintError } from 'sequelize';
import { USER_ERROR_MESSAGES } from '../constants/constants.js';

export function handleUniqueConstraintError(error, res) {
  if (!(error instanceof UniqueConstraintError)) {
    return false;
  }

  const constraint = error.parent?.constraint ?? '';
  const detail = error.parent?.detail ?? '';
  const fields = Object.keys(error.fields ?? {});
  const paths = error.errors?.map((item) => item.path) ?? [];

  const isUsernameConflict =
    constraint.includes('username') ||
    fields.includes('username') ||
    paths.includes('username') ||
    /\("?username"?\)=/.test(detail);

  if (isUsernameConflict) {
    res.status(409).json({
      error: USER_ERROR_MESSAGES.USERNAME_ALREADY_EXISTS,
    });

    return true;
  }

  const isEmailConflict =
    constraint.includes('email') ||
    fields.includes('email') ||
    paths.includes('email') ||
    /\("?email"?\)=/.test(detail);

  if (isEmailConflict) {
    res.status(409).json({
      error: USER_ERROR_MESSAGES.EMAIL_ALREADY_EXISTS,
    });

    return true;
  }

  res
    .status(409)
    .json({ error: 'Ya existe un registro con esos datos únicos.' });
  return true;
}
