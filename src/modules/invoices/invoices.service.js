import {
  DOCUMENT_STATUSES,
  INVOICE_STATUSES,
} from '../../constants/constants.js';
import { BillingError } from '../../errors/billing-error.js';
import {
  invoiceVisibility,
  canReadInvoice,
} from './support/invoices.permissions.js';
import { assertCanRead, assertCanManage } from './support/invoices.guards.js';
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
  deleteInvoice,
} from './invoices.repository.js';

export async function listInvoices({ page = 1, limit = 20 }, actor) {
  const { rows, count } = await findInvoices({
    where: invoiceVisibility(actor),
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

export async function getInvoice(id, actor) {
  const invoice = await findExistingInvoice(id);
  assertCanRead(actor, invoice);
  return invoice;
}

export async function addInvoice(data, actor) {
  return inInvoiceTransaction(async (transaction) => {
    const document = await findDocumentForInvoice(data.documentId, transaction);
    if (!document || !canReadInvoice(actor, document)) {
      throw new BillingError('Documento no encontrado.', 404);
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

export async function editInvoice(id, data, actor) {
  assertCanManage(actor);
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

export async function removeInvoice(id, actor) {
  assertCanManage(actor);
  // Issued invoices remain as historical records; cancel instead of deleting them.
  await findExistingInvoice(id);
  throw new BillingError(
    'Las facturas emitidas no se eliminan; cancelá la factura.',
  );
}
