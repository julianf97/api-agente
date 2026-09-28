import { UniqueConstraintError } from 'sequelize';

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
      error: 'El nombre de usuario ya está registrado.',
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
      error: 'El email ya está registrado.',
    });

    return true;
  }

  console.error('Restricción única no identificada:', {
    constraint,
    detail,
    fields,
    paths,
  });

  res.status(500).json({
    error: 'No se pudo procesar la creación del usuario.',
  });

  return true;
}