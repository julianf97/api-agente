import { USER_ID_MAX } from '../../../constants/validation-limits.js';
import { param } from 'express-validator';
import {
  USER_VALIDATION_MESSAGES as MESSAGES,
} from '../../../constants/constants.js';

export const deleteUserValidation = [
  param('id')
    .matches(/^[1-9]\d*$/)
    .withMessage(MESSAGES.ID_MUST_BE_POSITIVE_INTEGER)
    .bail()
    .custom((value) => Number(value) <= USER_ID_MAX)
    .withMessage(MESSAGES.ID_INVALID)
    .toInt(),
];