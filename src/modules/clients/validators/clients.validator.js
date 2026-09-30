import { body, param, checkExact, oneOf } from 'express-validator';
import { USER_ID_MAX } from '../../../constants/validation-limits.js';
import { listInvoicesValidation } from '../../invoices/validators/listInvoices.validator.js';

export const listClientsValidation = listInvoicesValidation;
export const clientIdValidation = [
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

const fields = () => [
  text('name'),
  text('taxId', 32),
  text('address'),
  body('country')
    .optional()
    .isString()
    .bail()
    .matches(/^[A-Z]{2}$/),
  body('taxCondition')
    .optional()
    .custom(
      (value) =>
        value === null ||
        [
          'responsable_inscripto',
          'monotributista',
          'consumidor_final',
          'exento',
        ].includes(value),
    ),
];
export const createClientValidation = [
  ...fields(),
  checkExact([], { locations: ['body'] }),
];

export const updateClientValidation = [
  ...clientIdValidation,
  text('name').optional(),
  text('taxId', 32).optional(),
  text('address').optional(),
  body('country')
    .optional()
    .isString()
    .bail()
    .matches(/^[A-Z]{2}$/),
  body('taxCondition')
    .optional()
    .custom(
      (value) =>
        value === null ||
        [
          'responsable_inscripto',
          'monotributista',
          'consumidor_final',
          'exento',
        ].includes(value),
    ),
  oneOf(
    ['name', 'taxId', 'address', 'country', 'taxCondition'].map((field) =>
      body(field).exists(),
    ),
    { message: 'Enviá al menos un campo.' },
  ),
  checkExact([], { locations: ['body'] }),
];
