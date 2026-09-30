import { BillingError } from '../../../errors/billing-error.js';
import { assertDocumentExists } from '../../documents/support/documents.guards.js';
import { findDocumentForInvoice, findInvoiceClient } from '../invoices.repository.js';

export async function findExistingInvoiceDocument(id, transaction) {
  const document = await findDocumentForInvoice(id, transaction);
  assertDocumentExists(document);
  return document;
}

export async function findExistingInvoiceClient(id, transaction) {
  const client = await findInvoiceClient(id, transaction);
  if (!client) throw new BillingError('Cliente no encontrado.', 404);
  return client;
}
