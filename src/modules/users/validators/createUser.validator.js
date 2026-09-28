import { body, checkExact } from 'express-validator';
import {
  USER_ROLES,
  USER_VALIDATION_MESSAGES as MESSAGES,
} from '../../../constants/constants.js';

export const createUserValidation = [
  body('username')
    .exists().withMessage(MESSAGES.USERNAME_REQUIRED)
    .bail()
    .isString().withMessage(MESSAGES.USERNAME_MUST_BE_STRING)
    .bail()
    .trim()
    .notEmpty().withMessage(MESSAGES.USERNAME_NOT_EMPTY)
    .bail()
    .isLength({ max: 255 }).withMessage(MESSAGES.USERNAME_TOO_LONG),

  body('email')
    .exists().withMessage(MESSAGES.EMAIL_REQUIRED)
    .bail()
    .isString().withMessage(MESSAGES.EMAIL_MUST_BE_STRING)
    .bail()
    .trim()
    .notEmpty().withMessage(MESSAGES.EMAIL_NOT_EMPTY)
    .bail()
    .isEmail().withMessage(MESSAGES.EMAIL_INVALID)
    .bail()
    .isLength({ max: 255 }).withMessage(MESSAGES.EMAIL_TOO_LONG),

  body('password')
    .exists().withMessage(MESSAGES.PASSWORD_REQUIRED)
    .bail()
    .isString().withMessage(MESSAGES.PASSWORD_MUST_BE_STRING)
    .bail()
    .notEmpty().withMessage(MESSAGES.PASSWORD_NOT_EMPTY)
    .bail()
    .custom((value) => value.trim().length > 0)
    .withMessage(MESSAGES.PASSWORD_ONLY_SPACES)
    .bail()
    .custom((value) => Buffer.byteLength(value, 'utf8') <= 72)
    .withMessage(MESSAGES.PASSWORD_TOO_LONG)
    .hide(),

  body('role')
    .optional()
    .isString().withMessage(MESSAGES.ROLE_MUST_BE_STRING)
    .bail()
    .isIn([USER_ROLES.ADMIN, USER_ROLES.REGULAR])
    .withMessage(MESSAGES.ROLE_INVALID),

  checkExact([], { locations: ['body'] }),
];