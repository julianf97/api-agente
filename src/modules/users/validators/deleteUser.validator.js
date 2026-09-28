import { param } from 'express-validator';

export const deleteUserValidation = [
  param('id')
    .matches(/^[1-9]\d*$/).withMessage('El ID debe ser un entero positivo.')
    .bail()
    .custom((value) => Number(value) <= 2_147_483_647)
    .withMessage('El ID no es válido.')
    .toInt(),
];