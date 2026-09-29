import { INVOICE_STATUSES } from '../../constants/constants.js';
import { AuthorizationError } from '../../errors/authorization-error.js';
import { UserNotFoundError } from '../../errors/user-not-found-error.js';
import { findUserById } from '../users/users.repository.js';
import { assertCanRead, assertCanEdit, assertCanManage } from './invoices.guards.js';
import { isInvoiceManager } from './invoices.permissions.js';
import { findExistingInvoice } from './find-existing-invoice.js';
import {
  findInvoices, createInvoice, updateInvoice, deleteInvoice,
} from './invoices.repository.js';

export async function listInvoices({ page = 1, limit = 20 }, actor) {
  const where = isInvoiceManager(actor) ? {} : { userId: Number(actor.sub) };
  const { rows, count } = await findInvoices({ where, limit, offset: (page - 1) * limit });
  return { invoices: rows, total: count, page, limit, totalPages: Math.ceil(count / limit) };
}

export async function getInvoice(id, actor) {
  const invoice = await findExistingInvoice(id);
  assertCanRead(actor, invoice);
  return invoice;
}

export async function addInvoice(data, actor) {
  if (!isInvoiceManager(actor) && (data.userId !== undefined ||
      (data.status !== undefined && data.status !== INVOICE_STATUSES.DRAFT))) {
    throw new AuthorizationError();
  }
  const userId = isInvoiceManager(actor) ? (data.userId ?? Number(actor.sub)) : Number(actor.sub);
  if (!await findUserById(userId)) throw new UserNotFoundError();
  const status = data.status ?? INVOICE_STATUSES.DRAFT;
  return createInvoice({
    number: data.number, customerName: data.customerName, amount: data.amount,
    userId, status,
    issuedAt: [INVOICE_STATUSES.ISSUED, INVOICE_STATUSES.PAID].includes(status) ? new Date() : null,
  });
}

export async function editInvoice(id, data, actor) {
  const invoice = await findExistingInvoice(id);
  assertCanEdit(actor, invoice);
  if (!isInvoiceManager(actor) && (data.userId !== undefined || data.status !== undefined)) {
    throw new AuthorizationError();
  }
  if (data.userId !== undefined && !await findUserById(data.userId)) throw new UserNotFoundError();
  const changes = { ...data };
  if (data.status && [INVOICE_STATUSES.ISSUED, INVOICE_STATUSES.PAID].includes(data.status) &&
      !invoice.issuedAt) changes.issuedAt = new Date();
  return updateInvoice(invoice, changes);
}

export async function removeInvoice(id, actor) {
  assertCanManage(actor);
  const invoice = await findExistingInvoice(id);
  await deleteInvoice(invoice);
}
