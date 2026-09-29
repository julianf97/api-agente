import { InvoiceNotFoundError } from '../../errors/invoice-not-found-error.js';
import { findInvoiceById } from './invoices.repository.js';

export async function findExistingInvoice(id) {
  const invoice = await findInvoiceById(id);
  if (!invoice) throw new InvoiceNotFoundError();
  return invoice;
}
