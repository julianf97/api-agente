import { Router } from 'express';
import {
  listInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice,
} from './invoices.controller.js';
import { invoiceIdValidation } from './validators/invoiceId.validator.js';
import { listInvoicesValidation } from './validators/listInvoices.validator.js';
import { createInvoiceValidation } from './validators/createInvoice.validator.js';
import { updateInvoiceValidation } from './validators/updateInvoice.validator.js';
import { handleValidation } from '../../middleweres/handle-validation.js';
import { requireRoles } from '../../middleweres/requiere-roles.js';
import { USER_ROLES } from '../../constants/constants.js';

const router = Router();
router.get('/', listInvoicesValidation, handleValidation, listInvoices);
router.get('/:id', invoiceIdValidation, handleValidation, getInvoice);
router.post('/', createInvoiceValidation, handleValidation, createInvoice);
router.patch('/:id', updateInvoiceValidation, handleValidation, updateInvoice);
router.delete('/:id', requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN),
  invoiceIdValidation, handleValidation, deleteInvoice);
export default router;
