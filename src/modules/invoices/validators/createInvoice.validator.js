import { checkExact } from 'express-validator';
import {
  invoiceAmount, invoiceStatus, invoiceText, invoiceUserId,
} from './invoice-fields.validator.js';

export const createInvoiceValidation = [
  invoiceText('number')
    .exists()
    .withMessage('number es obligatorio.'),

  invoiceText('customerName')
    .exists()
    .withMessage('customerName es obligatorio.'),

  invoiceAmount()
    .exists()
    .withMessage('amount es obligatorio.'),

  invoiceUserId().optional(),
  invoiceStatus().optional(),

  checkExact([], { locations: ['body'] }),
];
