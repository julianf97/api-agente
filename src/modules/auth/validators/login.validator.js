import { body, checkExact } from 'express-validator';

export const loginValidation = [
  body('email')
    .exists().withMessage('El email es obligatorio.')
    .bail()
    .isString().withMessage('El email debe ser texto.')
    .bail()
    .trim()
    .notEmpty().withMessage('El email es obligatorio.')
    .bail()
    .isEmail().withMessage('El email no es válido.'),

  body('password')
    .exists().withMessage('La contraseña es obligatoria.')
    .bail()
    .isString().withMessage('La contraseña debe ser texto.')
    .bail()
    .notEmpty().withMessage('La contraseña es obligatoria.')
    .hide(),

  checkExact([], { locations: ['body'] }),
];