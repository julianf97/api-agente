import { AuthorizationError } from '../../errors/authorization-error.js';
import { InvoiceNotFoundError } from '../../errors/invoice-not-found-error.js';
import {
  isInvoiceManager, canReadInvoice, canEditInvoice, canCreateInvoice, canUpdateInvoice,
} from './invoices.permissions.js';

export function assertCanRead(actor, invoice) {
  // A regular user must not learn whether another user's invoice exists.
  if (!canReadInvoice(actor, invoice)) throw new InvoiceNotFoundError();
}

export function assertCanEdit(actor, invoice) {
  assertCanRead(actor, invoice);
  if (!canEditInvoice(actor, invoice)) throw new AuthorizationError();
}

export function assertCanManage(actor) {
  if (!isInvoiceManager(actor)) throw new AuthorizationError();
}

export function assertCanCreate(actor, data) {
  if (!canCreateInvoice(actor, data)) throw new AuthorizationError();
}

export function assertCanUpdate(actor, invoice, data) {
  assertCanEdit(actor, invoice);
  if (!canUpdateInvoice(actor, data)) throw new AuthorizationError();
}
