import { BillingError } from '../../../errors/billing-error.js';
import { findClientById } from '../clients.repository.js';

export async function findExistingClientById(id) {
  const client = await findClientById(id);
  if (!client) throw new BillingError('Cliente no encontrado.', 404);
  return client;
}
