import { body, checkExact } from 'express-validator';
import {
  AUTH_VALIDATION_MESSAGES as MESSAGES,
} from '../../constants/constants.js';

export const loginValidation = [
  body('email')
    .exists().withMessage(MESSAGES.EMAIL_REQUIRED)
    .bail()
    .isString().withMessage(MESSAGES.EMAIL_MUST_BE_STRING)
    .bail()
    .trim()
    .notEmpty().withMessage(MESSAGES.EMAIL_REQUIRED)
    .bail()
    .isEmail().withMessage(MESSAGES.EMAIL_INVALID),

  body('password')
    .exists().withMessage(MESSAGES.PASSWORD_REQUIRED)
    .bail()
    .isString().withMessage(MESSAGES.PASSWORD_MUST_BE_STRING)
    .bail()
    .notEmpty().withMessage(MESSAGES.PASSWORD_REQUIRED)
    .hide(),

  checkExact([], { locations: ['body'] }),
];