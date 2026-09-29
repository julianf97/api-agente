import { body, checkExact, oneOf } from 'express-validator';
import { INVOICE_VALIDATION_MESSAGES as MESSAGES } from '../../../constants/constants.js';
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
    { message: MESSAGES.UPDATE_REQUIRES_FIELD },
  ),

  checkExact([], { locations: ['body'] }),
];
