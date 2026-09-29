import { UniqueConstraintError } from 'sequelize';

export function handleInvoiceNumberConflict(error, res) {
  if (!(error instanceof UniqueConstraintError)) return false;
  const constraint = error.parent?.constraint ?? '';
  const fields = Object.keys(error.fields ?? {});
  const paths = error.errors?.map((item) => item.path) ?? [];
  if (!constraint.includes('number') && !fields.includes('number') && !paths.includes('number')) return false;
  res.status(409).json({ error: 'El número de factura ya existe.' });
  return true;
}
