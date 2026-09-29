import Invoice from '../../models/invoice.js';

export const findInvoices = (options) => Invoice.findAndCountAll({
  ...options,
  order: [['id', 'ASC']],
});
export const findInvoiceById = (id) => Invoice.findByPk(id);
export const createInvoice = (data) => Invoice.create(data);
export const updateInvoice = (invoice, data) => invoice.update(data);
export const deleteInvoice = (invoice) => invoice.destroy();
