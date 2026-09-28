import { body, checkExact, oneOf, param } from 'express-validator';
import {
  USER_VALIDATION_MESSAGES as MESSAGES,
} from '../../../constants/constants.js';

export const updateUserValidation = [
  param('id')
    .matches(/^[1-9]\d*$/)
    .withMessage(MESSAGES.ID_MUST_BE_POSITIVE_INTEGER)
    .bail()
    .custom((value) => Number(value) <= 2_147_483_647)
    .withMessage(MESSAGES.ID_INVALID)
    .toInt(),

  body('username')
    .optional()
    .isString().withMessage(MESSAGES.USERNAME_MUST_BE_STRING)
    .bail()
    .trim()
    .notEmpty().withMessage(MESSAGES.USERNAME_NOT_EMPTY)
    .isLength({ max: 255 }).withMessage(MESSAGES.USERNAME_TOO_LONG),

  body('email')
    .optional()
    .isString().withMessage(MESSAGES.EMAIL_MUST_BE_STRING)
    .bail()
    .trim()
    .notEmpty().withMessage(MESSAGES.EMAIL_NOT_EMPTY)
    .bail()
    .isEmail().withMessage(MESSAGES.EMAIL_INVALID)
    .isLength({ max: 255 }).withMessage(MESSAGES.EMAIL_TOO_LONG),

  body('password')
    .optional()
    .isString().withMessage(MESSAGES.PASSWORD_MUST_BE_STRING)
    .bail()
    .custom((value) => value.trim().length > 0)
    .withMessage(MESSAGES.PASSWORD_NOT_EMPTY)
    .bail()
    .custom((value) => Buffer.byteLength(value, 'utf8') <= 72)
    .withMessage(MESSAGES.PASSWORD_TOO_LONG)
    .hide(),

  oneOf(
    [
      body('username').exists(),
      body('email').exists(),
      body('password').exists(),
    ],
    { message: MESSAGES.UPDATE_REQUIRES_FIELD },
  ),

  checkExact([], { locations: ['body'] }),
];