import { checkExact, query } from 'express-validator';
import { USERS_PAGE_LIMIT_MAX } from '../../../constants/validation-limits.js';

export const listInvoicesValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page debe ser mayor o igual a 1.')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: USERS_PAGE_LIMIT_MAX })
    .withMessage('Limit debe estar entre 1 y 100.')
    .toInt(),

  checkExact([], { locations: ['query'] }),
];
