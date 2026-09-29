import { AuthorizationError } from '../../errors/authorization-error.js';
import { InvoiceNotFoundError } from '../../errors/invoice-not-found-error.js';
import { isInvoiceManager, canReadInvoice, canEditInvoice } from './invoices.permissions.js';

export function assertCanRead(actor, invoice) {
  if (!canReadInvoice(actor, invoice)) throw new InvoiceNotFoundError();
}

export function assertCanEdit(actor, invoice) {
  assertCanRead(actor, invoice);
  if (!canEditInvoice(actor, invoice)) throw new AuthorizationError();
}

export function assertCanManage(actor) {
  if (!isInvoiceManager(actor)) throw new AuthorizationError();
}
