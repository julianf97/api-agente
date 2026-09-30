import { body, checkExact } from 'express-validator';
import { invoiceText } from './invoice-fields.validator.js';
import { USER_ID_MAX } from '../../../constants/validation-limits.js';

export const createInvoiceValidation = [
  invoiceText('number'),
  body('documentId')
    .custom(Number.isInteger)
    .withMessage('documentId debe ser un entero JSON.')
    .bail()
    .isInt({ min: 1, max: USER_ID_MAX })
    .withMessage('documentId no es válido.'),
  checkExact([], { locations: ['body'] }),
];
