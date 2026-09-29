import Invoice from '../../models/invoice.js';

export async function findInvoices({ where, limit, offset }) {
  return Invoice.findAndCountAll({
    where,
    order: [['id', 'ASC']],
    limit,
    offset,
  });
}

export async function createInvoice(data) {
  return Invoice.create(data);
}

export async function findInvoiceById(id) {
  return Invoice.findByPk(id);
}

export async function updateInvoice(invoice, data) {
  return invoice.update(data);
}

export async function deleteInvoice(invoice) {
  return invoice.destroy();
}