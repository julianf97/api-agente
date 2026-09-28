import { ForeignKeyConstraintError } from 'sequelize';

export function handleDeleteUserError(error, _req, res, next) {
  if (!(error instanceof ForeignKeyConstraintError)) {
    return next(error);
  }

  return res.status(409).json({
    error: 'No se puede eliminar el usuario porque tiene registros relacionados.',
  });
}