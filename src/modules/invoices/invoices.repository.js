import { Invoice, Document, Client } from '../../models/index.js';
import { sequelize } from '../../db/index.js';

export function findInvoices({ where, limit, offset }) {
  return Invoice.findAndCountAll({
    where,
    order: [['id', 'ASC']],
    limit,
    offset,
  });
}

export function findInvoiceById(id, transaction) {
  return Invoice.findByPk(
    id,
    transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {},
  );
}

export function inInvoiceTransaction(action) {
  return sequelize.transaction(action);
}

export function findDocumentForInvoice(id, transaction) {
  return Document.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
}

export function findInvoiceClient(id, transaction) {
  return Client.findByPk(id, { transaction, lock: transaction.LOCK.SHARE });
}

export function createInvoice(data, transaction) {
  return Invoice.create(data, { transaction });
}

export function updateInvoice(invoice, data, transaction) {
  return invoice.update(data, { transaction });
}

export function markDocumentInvoiced(document, transaction) {
  return document.update({ status: 'invoiced' }, { transaction });
}

export function deleteInvoice(invoice, transaction) {
  return invoice.destroy({ transaction });
}
