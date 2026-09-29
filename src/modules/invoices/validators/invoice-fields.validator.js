import { body } from 'express-validator';
import {
  INVOICE_STATUSES,
  INVOICE_VALIDATION_MESSAGES as MESSAGES,
} from '../../../constants/constants.js';
import { USER_ID_MAX } from '../../../constants/validation-limits.js';

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

export const invoiceUserId = () =>
  body('userId')
    .custom(Number.isInteger)
    .withMessage(MESSAGES.USER_ID_MUST_BE_INTEGER)
    .bail()
    .isInt({ min: 1, max: USER_ID_MAX })
    .withMessage(MESSAGES.USER_ID_INVALID)
    .toInt();

export const invoiceStatus = () =>
  body('status')
    .isIn(Object.values(INVOICE_STATUSES))
    .withMessage(MESSAGES.STATUS_INVALID);
