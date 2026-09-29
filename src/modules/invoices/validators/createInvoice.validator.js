import { checkExact } from 'express-validator';
import { INVOICE_VALIDATION_MESSAGES as MESSAGES } from '../../../constants/constants.js';
import {
  invoiceAmount, invoiceStatus, invoiceText, invoiceUserId,
} from './invoice-fields.validator.js';

export const createInvoiceValidation = [
  invoiceText('number')
    .exists()
    .withMessage(MESSAGES.TEXT.number.REQUIRED),

  invoiceText('customerName')
    .exists()
    .withMessage(MESSAGES.TEXT.customerName.REQUIRED),

  invoiceAmount()
    .exists()
    .withMessage(MESSAGES.AMOUNT_REQUIRED),

  invoiceUserId().optional(),
  invoiceStatus().optional(),

  checkExact([], { locations: ['body'] }),
];
