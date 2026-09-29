import { invoiceVisibility } from './invoices.permissions.js';
import { findExistingInvoice } from './find-existing-invoice.js';
import { toInvoiceCreationData, toInvoiceUpdateData } from './invoices.mapper.js';
import {
  assertCanRead,
  assertCanCreate, 
  assertCanUpdate, 
  assertCanManage,
} from './invoices.guards.js';
import {
  findInvoices, 
  createInvoice, 
  updateInvoice, 
  deleteInvoice,
} from './invoices.repository.js';
import {
  assertInvoiceOwnerExists, 
  assertUpdatedInvoiceOwnerExists,
} from './assert-invoice-owner-exists.js';

export async function listInvoices({ page = 1, limit = 20 }, actor) {

  // Limita la consulta a las facturas propias si el usuario es regular.
  const where = invoiceVisibility(actor);

  const { rows, count } = await findInvoices({
    where,
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

  // Busca la factura y devuelve 404 si no existe.
  const invoice = await findExistingInvoice(id);

  // Impide que un usuario regular lea una factura ajena.
  assertCanRead(actor, invoice);

  return invoice;
}

export async function addInvoice(data, actor) {
  // Comprueba que el actor pueda crear una factura con esos datos.
  assertCanCreate(actor, data);

  // Completa el dueño, estado y fecha de emisión según el actor y los datos recibidos.
  const invoiceData = toInvoiceCreationData(data, actor);

  // Comprueba que exista el usuario al que se asignará la factura.
  await assertInvoiceOwnerExists(invoiceData.userId);

  return createInvoice(invoiceData);
}

export async function editInvoice(id, data, actor) {
  // Busca la factura y devuelve 404 si no existe.
  const invoice = await findExistingInvoice(id);

  // Comprueba que el actor pueda modificar esa factura y esos campos.
  assertCanUpdate(actor, invoice, data);

  // Comprueba que exista el nuevo dueño si se pidió cambiarlo.
  await assertUpdatedInvoiceOwnerExists(data);

  // Prepara los cambios y fija la fecha de emisión cuando corresponde.
  const changes = toInvoiceUpdateData(data, invoice);

  return updateInvoice(invoice, changes);
}

export async function removeInvoice(id, actor) {
  // Permite eliminar facturas únicamente a admin y superadmin.
  assertCanManage(actor);

  // Busca la factura y devuelve 404 si no existe.
  const invoice = await findExistingInvoice(id);

  await deleteInvoice(invoice);
}