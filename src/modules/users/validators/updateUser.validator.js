import { body, checkExact, oneOf, param } from 'express-validator';

export const updateUserValidation = [
  param('id')
    .matches(/^[1-9]\d*$/).withMessage('El ID debe ser un entero positivo.')
    .bail()
    .custom((value) => Number(value) <= 2_147_483_647)
    .withMessage('El ID no es válido.')
    .toInt(),

  body('username')
    .optional()
    .isString().withMessage('El nombre de usuario debe ser texto.')
    .bail()
    .trim()
    .notEmpty().withMessage('El nombre de usuario no puede estar vacío.')
    .isLength({ max: 255 }).withMessage(
      'El nombre de usuario no puede superar 255 caracteres.',
    ),

  body('email')
    .optional()
    .isString().withMessage('El email debe ser texto.')
    .bail()
    .trim()
    .notEmpty().withMessage('El email no puede estar vacío.')
    .bail()
    .isEmail().withMessage('El email no es válido.')
    .isLength({ max: 255 }).withMessage(
      'El email no puede superar 255 caracteres.',
    ),

  body('password')
    .optional()
    .isString().withMessage('La contraseña debe ser texto.')
    .bail()
    .custom((value) => value.trim().length > 0)
    .withMessage('La contraseña no puede estar vacía.')
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

  body('enabled')
    .optional()
    .isBoolean({ strict: true })
    .withMessage('Enabled debe ser true o false.'),

  oneOf(
    [
      body('username').exists(),
      body('email').exists(),
      body('password').exists(),
      body('role').exists(),
      body('enabled').exists(),
    ],
    { message: 'Enviá al menos un campo para actualizar.' },
  ),

  checkExact([], { locations: ['body'] }),
];