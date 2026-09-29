import { matchedData } from 'express-validator';
import {
  listInvoices as listService, getInvoice as getService, addInvoice as addService,
  editInvoice as editService, removeInvoice as removeService,
} from './invoices.service.js';
import { toInvoiceResponse } from './invoices.presenter.js';

export async function listInvoices(req, res, next) {
  try {
    const result = await listService(matchedData(req, { locations: ['query'] }), req.auth);
    return res.status(200).json({
      invoices: result.invoices.map(toInvoiceResponse),
      pagination: {
        total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages,
      },
    });
  } catch (error) { return next(error); }
}

export async function getInvoice(req, res, next) {
  try { return res.status(200).json(toInvoiceResponse(await getService(req.params.id, req.auth))); }
  catch (error) { return next(error); }
}

export async function createInvoice(req, res, next) {
  try { return res.status(201).json(toInvoiceResponse(await addService(req.validatedBody, req.auth))); }
  catch (error) { return next(error); }
}

export async function updateInvoice(req, res, next) {
  try {
    return res.status(200).json(toInvoiceResponse(await editService(req.params.id, req.validatedBody, req.auth)));
  } catch (error) { return next(error); }
}

export async function deleteInvoice(req, res, next) {
  try { await removeService(req.params.id, req.auth); return res.status(204).send(); }
  catch (error) { return next(error); }
}
