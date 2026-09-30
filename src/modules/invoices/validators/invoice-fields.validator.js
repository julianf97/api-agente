import { body } from 'express-validator';
import { INVOICE_VALIDATION_MESSAGES as MESSAGES } from '../../../constants/constants.js';

const amountPattern = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

export const invoiceText = (field) =>
  body(field)
    .isString()
    .withMessage(MESSAGES.TEXT[field].MUST_BE_STRING)
    .bail()
    .isLength({ max: 255 })
    .withMessage(MESSAGES.TEXT[field].TOO_LONG)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(MESSAGES.TEXT[field].NOT_EMPTY);

export const invoiceAmount = () =>
  body('amount')
    .isString()
    .withMessage(MESSAGES.AMOUNT_MUST_BE_STRING)
    .bail()
    .matches(amountPattern)
    .withMessage(MESSAGES.AMOUNT_INVALID)
    .bail()
    .custom((value) => Number(value) > 0)
    .withMessage(MESSAGES.AMOUNT_NOT_POSITIVE);
