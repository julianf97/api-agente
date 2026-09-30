import { USER_ROLES } from '../../../constants/constants.js';

export function isInvoiceManager(actor) {
  return actor?.role === USER_ROLES.ADMIN;
}

export function canReadInvoice(actor, invoice) {
  return isInvoiceManager(actor) || Number(actor?.sub) === invoice.userId;
}

export function invoiceVisibility(actor) {
  return isInvoiceManager(actor) ? {} : { userId: Number(actor.sub) };
}
