import { body, checkExact } from 'express-validator';
import { invoiceIdValidation } from './invoiceId.validator.js';

export const updateInvoiceValidation = [
  ...invoiceIdValidation,
  body('status')
    .isIn(['paid', 'cancelled'])
    .withMessage('status debe ser paid o cancelled.'),
  checkExact([], { locations: ['body'] }),
];
