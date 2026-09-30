import { Router } from 'express';
import { invoiceIdValidation } from './validators/invoiceId.validator.js';
import { listInvoicesValidation } from './validators/listInvoices.validator.js';
import { createInvoiceValidation } from './validators/createInvoice.validator.js';
import { updateInvoiceValidation } from './validators/updateInvoice.validator.js';
import { handleValidation } from '../../middleweres/handle-validation.js';
import {
  listInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
} from './invoices.controller.js';

const router = Router();
router.get('/', listInvoicesValidation, handleValidation, listInvoices);
router.get('/:id', invoiceIdValidation, handleValidation, getInvoice);
router.post('/', createInvoiceValidation, handleValidation, createInvoice);
router.patch(
  '/:id',
  updateInvoiceValidation,
  handleValidation,
  updateInvoice,
);
router.delete(
  '/:id',
  invoiceIdValidation,
  handleValidation,
  deleteInvoice,
);

export default router;
