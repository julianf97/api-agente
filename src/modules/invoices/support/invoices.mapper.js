import { INVOICE_STATUSES } from '../../../constants/constants.js';
import { isInvoiceManager } from './invoices.permissions.js';

export function isIssued(status) {
  return [INVOICE_STATUSES.ISSUED, INVOICE_STATUSES.PAID].includes(status);
}

export function toInvoiceCreationData(data, actor) {
  const status = data.status ?? INVOICE_STATUSES.DRAFT;

  return {
    number: data.number,
    customerName: data.customerName,
    amount: data.amount,
    userId: isInvoiceManager(actor) ? (data.userId ?? Number(actor.sub)) : Number(actor.sub),
    status,
    issuedAt: isIssued(status) ? new Date() : null,
  };
}

export function toInvoiceUpdateData(data, invoice) {
  const changes = { ...data };

  if (isIssued(data.status) && !invoice.issuedAt) {
    changes.issuedAt = new Date();
  }

  return changes;
}
