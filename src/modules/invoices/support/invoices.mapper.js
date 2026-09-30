import {
  CLIENT_TAX_CONDITIONS as TAX,
  DOCUMENT_STATUSES,
  INVOICE_TYPES,
  INVOICE_STATUSES,
} from '../../../constants/constants.js';
import { BillingError } from '../../../errors/billing-error.js';

export function invoiceTypeFor(document, client) {
  if (document.isExport) return INVOICE_TYPES.E;
  if (client.country !== 'AR') {
    throw new BillingError('Una venta local requiere un cliente argentino.');
  }
  if ([TAX.REGISTERED, TAX.MONOTAX].includes(client.taxCondition))
    return INVOICE_TYPES.A;
  if ([TAX.FINAL_CONSUMER, TAX.EXEMPT].includes(client.taxCondition))
    return INVOICE_TYPES.B;
  throw new BillingError(
    'La condición fiscal del cliente no permite facturar.',
  );
}

export function toInvoiceCreationData(data, document, client) {
  return {
    number: data.number,
    documentId: document.id,
    clientId: document.clientId,
    userId: document.userId,
    type: invoiceTypeFor(document, client),
    customerName: client.name,
    customerTaxId: client.taxId,
    customerTaxCondition: client.taxCondition,
    customerCountry: client.country,
    customerAddress: client.address,
    amount: document.amount,
    status: INVOICE_STATUSES.ISSUED,
    issuedAt: new Date(),
  };
}

export function toInvoicedDocumentData() {
  return { status: DOCUMENT_STATUSES.INVOICED };
}
