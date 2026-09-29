import { body } from 'express-validator';
import { INVOICE_STATUSES } from '../../../constants/constants.js';
import { USER_ID_MAX } from '../../../constants/validation-limits.js';

const amountPattern = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

export const invoiceText = (field) =>
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

export const invoiceAmount = () =>
  body('amount')
    .isString()
    .withMessage('amount debe ser texto decimal.')
    .bail()
    .matches(amountPattern)
    .withMessage('amount debe ser un decimal positivo de hasta 10 enteros y 2 decimales.')
    .bail()
    .custom((value) => Number(value) > 0)
    .withMessage('amount debe ser mayor que cero.');

export const invoiceUserId = () =>
  body('userId')
    .custom(Number.isInteger)
    .withMessage('userId debe ser un entero JSON.')
    .bail()
    .isInt({ min: 1, max: USER_ID_MAX })
    .withMessage('userId debe ser un entero positivo válido.')
    .toInt();

export const invoiceStatus = () =>
  body('status')
    .isIn(Object.values(INVOICE_STATUSES))
    .withMessage('status no es válido.');
