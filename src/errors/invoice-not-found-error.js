export class InvoiceNotFoundError extends Error {
  constructor() {
    super('Factura no encontrada.');
    this.name = 'InvoiceNotFoundError';
  }
}

export function handleInvoiceNotFoundError(error, res) {
  if (!(error instanceof InvoiceNotFoundError)) return false;
  res.status(404).json({ error: error.message });
  return true;
}
