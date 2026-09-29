import { USER_ROLES, INVOICE_STATUSES } from '../../../constants/constants.js';

export function  isInvoiceManager(actor) {
 return  [USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN].includes(actor?.role);
}

export function canReadInvoice(actor, invoice) {
  return isInvoiceManager(actor) || Number(actor?.sub) === invoice.userId;
}

export function canEditInvoice(actor, invoice) {
  return isInvoiceManager(actor) || (
    Number(actor?.sub) === invoice.userId && invoice.status === INVOICE_STATUSES.DRAFT
  );
}

export function canCreateInvoice(actor, data) {
  return isInvoiceManager(actor) || (
    data.userId === undefined &&
    (data.status === undefined || data.status === INVOICE_STATUSES.DRAFT)
  );
}

export function canUpdateInvoice(actor, data) {
  return isInvoiceManager(actor) || (data.userId === undefined && data.status === undefined);
}

export function invoiceVisibility(actor) {
  return isInvoiceManager(actor) ? 
  {} 
  : 
  { userId: Number(actor.sub) };
}
