import { USER_ROLES, INVOICE_STATUSES } from '../../constants/constants.js';

export const isInvoiceManager = (actor) =>
  [USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN].includes(actor?.role);

export function canReadInvoice(actor, invoice) {
  return isInvoiceManager(actor) || Number(actor?.sub) === invoice.userId;
}

export function canEditInvoice(actor, invoice) {
  return isInvoiceManager(actor) || (
    Number(actor?.sub) === invoice.userId && invoice.status === INVOICE_STATUSES.DRAFT
  );
}
