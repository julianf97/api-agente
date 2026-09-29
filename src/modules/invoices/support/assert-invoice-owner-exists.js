import { findExistingUserById } from '../../users/support/find-existing-user.js';

export async function assertInvoiceOwnerExists(userId) {
  await findExistingUserById(userId);
}

export async function assertUpdatedInvoiceOwnerExists(data) {
  if (data.userId !== undefined) {
    await assertInvoiceOwnerExists(data.userId);
  }
}
