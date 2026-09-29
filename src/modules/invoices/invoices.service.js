import {
  assertCanRead, assertCanCreate, assertCanUpdate, assertCanManage,
} from './invoices.guards.js';
import { invoiceVisibility } from './invoices.permissions.js';
import { findExistingInvoice } from './find-existing-invoice.js';
import { toInvoiceCreationData, toInvoiceUpdateData } from './invoices.mapper.js';
import {
  assertInvoiceOwnerExists, assertUpdatedInvoiceOwnerExists,
} from './assert-invoice-owner-exists.js';
import {
  findInvoices, createInvoice, updateInvoice, deleteInvoice,
} from './invoices.repository.js';

export async function listInvoices({ page = 1, limit = 20 }, actor) {
  const { rows, count } = await findInvoices({
    where: invoiceVisibility(actor),
    limit,
    offset: (page - 1) * limit,
  });
  return { invoices: rows, total: count, page, limit, totalPages: Math.ceil(count / limit) };
}

export async function getInvoice(id, actor) {
  const invoice = await findExistingInvoice(id);
  assertCanRead(actor, invoice);
  return invoice;
}

export async function addInvoice(data, actor) {
  assertCanCreate(actor, data);
  const invoiceData = toInvoiceCreationData(data, actor);
  await assertInvoiceOwnerExists(invoiceData.userId);
  return createInvoice(invoiceData);
}

export async function editInvoice(id, data, actor) {
  const invoice = await findExistingInvoice(id);
  assertCanUpdate(actor, invoice, data);
  await assertUpdatedInvoiceOwnerExists(data);
  return updateInvoice(invoice, toInvoiceUpdateData(data, invoice));
}

export async function removeInvoice(id, actor) {
  assertCanManage(actor);
  const invoice = await findExistingInvoice(id);
  await deleteInvoice(invoice);
}
