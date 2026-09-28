import { USERS_PAGE_LIMIT_MAX } from '../../../constants/validation-limits.js';
import { checkExact, query } from 'express-validator';
import {
  USER_VALIDATION_MESSAGES as MESSAGES,
} from '../../../constants/constants.js';

export const listUsersValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage(MESSAGES.PAGE_INVALID)
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: USERS_PAGE_LIMIT_MAX })
    .withMessage(MESSAGES.LIMIT_INVALID)
    .toInt(),

  checkExact([], { locations: ['query'] }),
];