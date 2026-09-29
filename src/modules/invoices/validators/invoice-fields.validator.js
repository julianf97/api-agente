import { body, param, query, checkExact, oneOf } from 'express-validator';
import { INVOICE_STATUSES } from '../../../constants/constants.js';
import {
  USER_ID_MAX,
  USERS_PAGE_LIMIT_MAX,
} from '../../../constants/validation-limits.js';

const amountPattern = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

const text = (field) =>
  body(field)
    .isString()
    .withMessage(`${field} debe ser texto.`)
    .bail()
    .isLength({ max: 255 })
    .withMessage(`${field} no puede superar 255 caracteres.`)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(`${field} no puede estar vacío.`);

const amount = () =>
  body('amount')
    .isString()
    .withMessage('amount debe ser texto decimal.')
    .bail()
    .matches(amountPattern)
    .withMessage(
      'amount debe ser un decimal positivo de hasta 10 enteros y 2 decimales.',
    )
    .bail()
    .custom((value) => Number(value) > 0)
    .withMessage('amount debe ser mayor que cero.');

const userId = () =>
  body('userId')
    .custom(Number.isInteger)
    .withMessage('userId debe ser un entero JSON.')
    .bail()
    .isInt({ min: 1, max: USER_ID_MAX })
    .withMessage('userId debe ser un entero positivo válido.')
    .toInt();

const status = () =>
  body('status')
    .isIn(Object.values(INVOICE_STATUSES))
    .withMessage('status no es válido.');

export const invoiceIdValidation = [
  param('id')
    .matches(/^[1-9]\d*$/)
    .withMessage('El ID debe ser un entero positivo.')
    .bail()
    .custom((value) => Number(value) <= USER_ID_MAX)
    .withMessage('El ID no es válido.')
    .toInt(),
];

export const listInvoicesValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page debe ser mayor o igual a 1.')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: USERS_PAGE_LIMIT_MAX })
    .withMessage('Limit debe estar entre 1 y 100.')
    .toInt(),

  checkExact([], { locations: ['query'] }),
];

export const createInvoiceValidation = [
  text('number')
    .exists()
    .withMessage('number es obligatorio.'),

  text('customerName')
    .exists()
    .withMessage('customerName es obligatorio.'),

  amount()
    .exists()
    .withMessage('amount es obligatorio.'),

  userId().optional(),
  status().optional(),

  checkExact([], { locations: ['body'] }),
];

export const updateInvoiceValidation = [
  ...invoiceIdValidation,

  text('number').optional(),
  text('customerName').optional(),
  amount().optional(),
  userId().optional(),
  status().optional(),

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