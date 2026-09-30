import {
  DOCUMENT_STATUSES,
  DOCUMENT_TYPES,
  INVOICE_STATUSES,
} from '../../constants/constants.js';
import { BillingError } from '../../errors/billing-error.js';
import { findExistingInvoice } from './support/find-existing-invoice.js';
import { toInvoiceCreationData } from './support/invoices.mapper.js';
import {
  findInvoices,
  inInvoiceTransaction,
  findDocumentForInvoice,
  findInvoiceClient,
  createInvoice,
  markDocumentInvoiced,
  updateInvoice,
} from './invoices.repository.js';

export async function listInvoices({ page = 1, limit = 20 }) {
  const { rows, count } = await findInvoices({
    limit,
    offset: (page - 1) * limit,
  });
  return {
    invoices: rows,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  };
}

export async function getInvoice(id) {
  const invoice = await findExistingInvoice(id);
  return invoice;
}

export async function addInvoice(data) {
  return inInvoiceTransaction(async (transaction) => {
    const document = await findDocumentForInvoice(data.documentId, transaction);
    if (!document) {
      throw new BillingError('Documento no encontrado.', 404);
    }
    if (document.type !== DOCUMENT_TYPES.SALES_ORDER) {
      throw new BillingError('Solo se pueden facturar documentos de tipo OV.');
    }
    if (document.status !== DOCUMENT_STATUSES.PENDING) {
      throw new BillingError('Solo se puede facturar una orden pendiente.');
    }
    const client = await findInvoiceClient(document.clientId, transaction);
    if (!client) throw new BillingError('Cliente no encontrado.', 404);
    const invoice = await createInvoice(
      toInvoiceCreationData(data, document, client),
      transaction,
    );
    await markDocumentInvoiced(document, transaction);
    return invoice;
  });
}

export async function editInvoice(id, data) {
  return inInvoiceTransaction(async (transaction) => {
    const invoice = await findExistingInvoice(id, transaction);
    if (
      invoice.status === INVOICE_STATUSES.CANCELLED ||
      ![INVOICE_STATUSES.PAID, INVOICE_STATUSES.CANCELLED].includes(data.status)
    ) {
      throw new BillingError(
        'La factura solo puede marcarse pagada o cancelada; una cancelada no se modifica.',
      );
    }
    return updateInvoice(invoice, { status: data.status }, transaction);
  });
}

export async function removeInvoice(id) {
  // Issued invoices remain as historical records; cancel instead of deleting them.
  await findExistingInvoice(id);
  throw new BillingError(
    'Las facturas emitidas no se eliminan; cancelá la factura.',
  );
}
