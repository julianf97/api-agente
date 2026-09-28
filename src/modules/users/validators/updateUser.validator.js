import { USER_ID_MAX, USERNAME_MAX_LENGTH, EMAIL_MAX_LENGTH, PASSWORD_MAX_UTF8_BYTES } from '../../../constants/validation-limits.js';
import { body, checkExact, oneOf, param } from 'express-validator';
import {
  USER_VALIDATION_MESSAGES as MESSAGES,
} from '../../../constants/constants.js';

export const updateUserValidation = [
  param('id')
    .matches(/^[1-9]\d*$/)
    .withMessage(MESSAGES.ID_MUST_BE_POSITIVE_INTEGER)
    .bail()
    .custom((value) => Number(value) <= USER_ID_MAX)
    .withMessage(MESSAGES.ID_INVALID)
    .toInt(),

  body('username')
    .optional()
    .isString().withMessage(MESSAGES.USERNAME_MUST_BE_STRING)
    .bail()
    .trim()
    .notEmpty().withMessage(MESSAGES.USERNAME_NOT_EMPTY)
    .isLength({ max: USERNAME_MAX_LENGTH }).withMessage(MESSAGES.USERNAME_TOO_LONG),

  body('email')
    .optional()
    .isString().withMessage(MESSAGES.EMAIL_MUST_BE_STRING)
    .bail()
    .trim()
    .notEmpty().withMessage(MESSAGES.EMAIL_NOT_EMPTY)
    .bail()
    .isEmail().withMessage(MESSAGES.EMAIL_INVALID)
    .isLength({ max: EMAIL_MAX_LENGTH }).withMessage(MESSAGES.EMAIL_TOO_LONG),

  body('password')
    .optional()
    .isString().withMessage(MESSAGES.PASSWORD_MUST_BE_STRING)
    .bail()
    .custom((value) => value.trim().length > 0)
    .withMessage(MESSAGES.PASSWORD_NOT_EMPTY)
    .bail()
    .custom((value) => Buffer.byteLength(value, 'utf8') <= PASSWORD_MAX_UTF8_BYTES)
    .withMessage(MESSAGES.PASSWORD_TOO_LONG)
    .hide(),

  body('enabled')
    .optional()
    .isBoolean({ strict: true })
    .withMessage(MESSAGES.ENABLED_MUST_BE_BOOLEAN),

  oneOf(
    [
      body('username').exists(),
      body('email').exists(),
      body('password').exists(),
      body('enabled').exists(),
    ],
    { message: MESSAGES.UPDATE_REQUIRES_FIELD },
  ),

  checkExact([], { locations: ['body'] }),
];