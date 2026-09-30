import { DOCUMENT_TYPES } from '../../../constants/constants.js';
import { body, param, checkExact, oneOf } from 'express-validator';
import { USER_ID_MAX } from '../../../constants/validation-limits.js';
import { listInvoicesValidation } from '../../invoices/validators/listInvoices.validator.js';

export const listDocumentsValidation = listInvoicesValidation;
export const documentIdValidation = [
  param('id')
    .matches(/^[1-9]\d*$/)
    .bail()
    .isInt({ min: 1, max: USER_ID_MAX })
    .toInt(),
];

const text = (field, max = 255) =>
  body(field).isString().bail().isLength({ max }).bail().trim().notEmpty();
const id = (field) =>
  body(field)
    .custom(Number.isInteger)
    .bail()
    .isInt({ min: 1, max: USER_ID_MAX });

import { invoiceAmount } from '../../invoices/validators/invoice-fields.validator.js';
const fields = () => [
  text('number'),
  id('clientId'),
  invoiceAmount(),
  body('isExport').optional().isBoolean({ strict: true }),
  id('userId').optional(),
  body('type').optional().isIn(Object.values(DOCUMENT_TYPES)),
];
export const createDocumentValidation = [
  ...fields(),
  checkExact([], { locations: ['body'] }),
];
export const updateDocumentValidation = [
  ...documentIdValidation,
  ...fields().map((field) => field.optional()),
  body('status').optional().equals('cancelled'),
  oneOf(
    [
      'number',
      'clientId',
      'amount',
      'isExport',
      'userId',
      'type',
      'status',
    ].map((field) => body(field).exists()),
    { message: 'Enviá al menos un campo.' },
  ),
  checkExact([], { locations: ['body'] }),
];
