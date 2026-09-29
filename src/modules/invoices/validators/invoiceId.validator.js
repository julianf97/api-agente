import { param } from 'express-validator';
import { USER_ID_MAX } from '../../../constants/validation-limits.js';

export const invoiceIdValidation = [
  param('id')
    .matches(/^[1-9]\d*$/)
    .withMessage('El ID debe ser un entero positivo.')
    .bail()
    .custom((value) => Number(value) <= USER_ID_MAX)
    .withMessage('El ID no es válido.')
    .toInt(),
];
