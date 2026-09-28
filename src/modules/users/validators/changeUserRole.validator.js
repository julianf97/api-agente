import { body, checkExact, param } from 'express-validator';
import {
  USER_ROLES,
  USER_VALIDATION_MESSAGES as MESSAGES,
} from '../../../constants/constants.js';

export const changeUserRoleValidation = [
  param('id')
    .matches(/^[1-9]\d*$/)
    .withMessage(MESSAGES.ID_MUST_BE_POSITIVE_INTEGER)
    .bail()
    .custom((value) => Number(value) <= 2_147_483_647)
    .withMessage(MESSAGES.ID_INVALID)
    .toInt(),

  body('role')
    .exists()
    .withMessage(MESSAGES.ROLE_REQUIRED)
    .bail()
    .isString()
    .withMessage(MESSAGES.ROLE_MUST_BE_STRING)
    .bail()
    .isIn([USER_ROLES.REGULAR, USER_ROLES.ADMIN])
    .withMessage(MESSAGES.ROLE_INVALID),

  checkExact([], { locations: ['body'] }),
];