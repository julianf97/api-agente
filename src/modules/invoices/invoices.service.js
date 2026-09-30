import {
  assertCanInvoiceDocument,
  assertCanUpdateInvoice,
  assertCanDeleteInvoice,
} from './support/invoices.guards.js';
import {
  findExistingInvoiceDocument,
  findExistingInvoiceClient,
} from './support/find-invoice-references.js';
import { findExistingInvoice } from './support/find-existing-invoice.js';
import { toInvoiceCreationData, toInvoicedDocumentData } from './support/invoices.mapper.js';
import {
  findInvoices,
  inInvoiceTransaction,
  createInvoice,
  updateInvoiceDocument,
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
  return findExistingInvoice(id);
}

export async function addInvoice(data) {
  return inInvoiceTransaction(async (transaction) => {
    const document = await findExistingInvoiceDocument(data.documentId, transaction);
    assertCanInvoiceDocument(document);
    const client = await findExistingInvoiceClient(document.clientId, transaction);
    const invoice = await createInvoice(
      toInvoiceCreationData(data, document, client),
      transaction,
    );
    await updateInvoiceDocument(document, toInvoicedDocumentData(), transaction);
    return invoice;
  });
}

export async function editInvoice(id, data) {
  return inInvoiceTransaction(async (transaction) => {
    const invoice = await findExistingInvoice(id, transaction);
    assertCanUpdateInvoice(invoice, data);
    return updateInvoice(invoice, { status: data.status }, transaction);
  });
}

export async function removeInvoice(id) {
  await findExistingInvoice(id);
  assertCanDeleteInvoice();
}
