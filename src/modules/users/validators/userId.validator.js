import { param } from 'express-validator';
import {
  USER_VALIDATION_MESSAGES as MESSAGES,
} from '../../../constants/constants.js';

export const userIdValidation = [
  param('id')
    .matches(/^[1-9]\d*$/)
    .withMessage(MESSAGES.ID_MUST_BE_POSITIVE_INTEGER)
    .bail()
    .custom((value) => Number(value) <= 2_147_483_647)
    .withMessage(MESSAGES.ID_INVALID)
    .toInt(),
];