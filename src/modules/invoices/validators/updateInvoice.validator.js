import { body, checkExact, oneOf } from 'express-validator';
import { invoiceIdValidation } from './invoiceId.validator.js';
import {
  invoiceAmount, invoiceStatus, invoiceText, invoiceUserId,
} from './invoice-fields.validator.js';

export const updateInvoiceValidation = [
  ...invoiceIdValidation,

  invoiceText('number').optional(),
  invoiceText('customerName').optional(),
  invoiceAmount().optional(),
  invoiceUserId().optional(),
  invoiceStatus().optional(),

  oneOf(
    [
      body('number').exists(),
      body('customerName').exists(),
      body('amount').exists(),
      body('userId').exists(),
      body('status').exists(),
    ],
    { message: 'Enviá al menos un campo para actualizar.' },
  ),

  checkExact([], { locations: ['body'] }),
];
