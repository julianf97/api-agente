import { body, checkExact } from 'express-validator';

export const createUserValidation = [
  body('username')
    .exists().withMessage('El nombre de usuario es obligatorio.')
    .bail()
    .isString().withMessage('El nombre de usuario debe ser texto.')
    .bail()
    .trim()
    .notEmpty().withMessage('El nombre de usuario no puede estar vacío.')
    .bail()
    .isLength({ max: 255 }).withMessage(
      'El nombre de usuario no puede superar 255 caracteres.',
    ),

  body('email')
    .exists().withMessage('El email es obligatorio.')
    .bail()
    .isString().withMessage('El email debe ser texto.')
    .bail()
    .trim()
    .notEmpty().withMessage('El email no puede estar vacío.')
    .bail()
    .isEmail().withMessage('El email no es válido.')
    .bail()
    .isLength({ max: 255 }).withMessage(
      'El email no puede superar 255 caracteres.',
    ),

  body('password')
    .exists().withMessage('La contraseña es obligatoria.')
    .bail()
    .isString().withMessage('La contraseña debe ser texto.')
    .bail()
    .notEmpty().withMessage('La contraseña no puede estar vacía.')
    .bail()
    .custom((value) => value.trim().length > 0)
    .withMessage('La contraseña no puede contener solo espacios.')
    .bail()
    .custom((value) => Buffer.byteLength(value, 'utf8') <= 72)
    .withMessage('La contraseña no puede superar 72 bytes.')
    .hide(),

  body('role')
    .optional()
    .isString().withMessage('El rol debe ser texto.')
    .bail()
    .isIn(['admin', 'regular'])
    .withMessage('El rol debe ser admin o regular.'),

  checkExact([], { locations: ['body'] }),
];