import { AuthorizationError } from '../../../errors/authorization-error.js';
import { InvoiceNotFoundError } from '../../../errors/invoice-not-found-error.js';
import { canReadInvoice, isInvoiceManager } from './invoices.permissions.js';

export function assertCanRead(actor, invoice) {
  if (!canReadInvoice(actor, invoice)) throw new InvoiceNotFoundError();
}

export function assertCanManage(actor) {
  if (!isInvoiceManager(actor)) throw new AuthorizationError();
}
