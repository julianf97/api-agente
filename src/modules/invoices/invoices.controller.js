import { matchedData } from 'express-validator';
import { toInvoiceResponse } from './support/invoices.presenter.js';
import {
  listInvoices as listInvoicesService,
  getInvoice as getInvoiceService,
  addInvoice as addInvoiceService,
  editInvoice as editInvoiceService,
  removeInvoice as removeInvoiceService,
} from './invoices.service.js';

export async function listInvoices(req, res, next) {
  try {
    const pagination = matchedData(req, { locations: ['query'] });
    const result = await listInvoicesService(pagination, req.auth);

    return res.status(200).json({
      invoices: result.invoices.map(toInvoiceResponse),
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getInvoice(req, res, next) {
  try {
    const invoice = await getInvoiceService(req.params.id, req.auth);

    return res.status(200).json(toInvoiceResponse(invoice));
  } catch (error) {
    return next(error);
  }
}

export async function createInvoice(req, res, next) {
  try {
    const invoice = await addInvoiceService(req.validatedBody, req.auth);

    return res.status(201).json(toInvoiceResponse(invoice));
  } catch (error) {
    return next(error);
  }
}

export async function updateInvoice(req, res, next) {
  try {
    const invoice = await editInvoiceService(
      req.params.id,
      req.validatedBody,
      req.auth,
    );

    return res.status(200).json(toInvoiceResponse(invoice));
  } catch (error) {
    return next(error);
  }
}

export async function deleteInvoice(req, res, next) {
  try {
    await removeInvoiceService(req.params.id, req.auth);

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}