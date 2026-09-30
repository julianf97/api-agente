import {
  DOCUMENT_STATUSES,
  DOCUMENT_TYPES,
  INVOICE_STATUSES,
} from '../../../constants/constants.js';
import { BillingError } from '../../../errors/billing-error.js';

export function assertCanInvoiceDocument(document) {
  if (document.type !== DOCUMENT_TYPES.SALES_ORDER) {
    throw new BillingError('Solo se pueden facturar documentos de tipo OV.');
  }
  if (document.status !== DOCUMENT_STATUSES.PENDING) {
    throw new BillingError('Solo se puede facturar una orden pendiente.');
  }
}

export function assertCanUpdateInvoice(invoice, data) {
  if (
    invoice.status === INVOICE_STATUSES.CANCELLED ||
    ![INVOICE_STATUSES.PAID, INVOICE_STATUSES.CANCELLED].includes(data.status)
  ) {
    throw new BillingError(
      'La factura solo puede marcarse pagada o cancelada; una cancelada no se modifica.',
    );
  }
}

export function assertCanDeleteInvoice() {
  throw new BillingError('Las facturas emitidas no se eliminan; cancelá la factura.');
}
