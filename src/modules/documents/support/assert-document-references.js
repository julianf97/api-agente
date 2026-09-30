import { BillingError } from '../../../errors/billing-error.js';
import { findExistingClientById } from '../../clients/support/find-existing-client.js';
import { findExistingUserById } from '../../users/support/find-existing-user.js';

export async function assertDocumentReferences(data) {
  if (data.clientId !== undefined) await findExistingClientById(data.clientId);
  if (data.userId !== undefined) {
    const user = await findExistingUserById(data.userId);
    if (!user.enabled) {
      throw new BillingError('El dueño del documento debe estar habilitado.');
    }
  }
}
