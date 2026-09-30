export class BillingError extends Error {
  constructor(message, status = 409) {
    super(message);
    this.status = status;
  }
}

export function handleBillingError(error, res) {
  if (!(error instanceof BillingError)) return false;
  res.status(error.status).json({ error: error.message });
  return true;
}
