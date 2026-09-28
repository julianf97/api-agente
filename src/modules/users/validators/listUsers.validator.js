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
    .isInt({ min: 1, max: 100 })
    .withMessage(MESSAGES.LIMIT_INVALID)
    .toInt(),

  checkExact([], { locations: ['query'] }),
];