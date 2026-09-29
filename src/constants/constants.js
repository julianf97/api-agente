export const USER_ROLES = Object.freeze({
  REGULAR: 'regular',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
});

export const INVOICE_STATUSES = Object.freeze({
  DRAFT: 'draft',
  ISSUED: 'issued',
  PAID: 'paid',
  CANCELLED: 'cancelled',
});

export const AUTH_ERROR_MESSAGES = Object.freeze({
  JWT_SECRET_REQUIRED: 'Falta configurar JWT_SECRET.',
  TOKEN_REQUIRED: 'Token de autenticación requerido.',
  INVALID_TOKEN: 'Token inválido.',
  INVALID_OR_EXPIRED_TOKEN: 'Token inválido o expirado.',
  USER_UNAVAILABLE: 'El usuario no existe o está deshabilitado.',
  INVALID_CREDENTIALS: 'Credenciales inválidas.',
  FORBIDDEN: 'No tenés permisos para realizar esta acción.',
  ADMIN_REQUIRED: 'No tenés permisos de administrador.',
});

export const AUTH_VALIDATION_MESSAGES = Object.freeze({
  EMAIL_REQUIRED: 'El email es obligatorio.',
  EMAIL_MUST_BE_STRING: 'El email debe ser texto.',
  EMAIL_INVALID: 'El email no es válido.',
  PASSWORD_REQUIRED: 'La contraseña es obligatoria.',
  PASSWORD_MUST_BE_STRING: 'La contraseña debe ser texto.',
});

export const USER_ERROR_MESSAGES = Object.freeze({
  USER_NOT_FOUND: 'Usuario no encontrado.',
  CANNOT_CREATE_WITH_ROLE:
    'No tenés permisos para crear un usuario con ese rol.',
  CANNOT_EDIT:
    'No tenés permisos para editar este usuario.',
  CANNOT_CHANGE_ROLE_HERE:
    'El rol no se puede cambiar desde la edición de usuarios.',
  CANNOT_CHANGE_ROLE:
    'No tenés permisos para cambiar el rol de este usuario.',
  CANNOT_DELETE:
    'No tenés permisos para eliminar este usuario.',
  CANNOT_DISABLE_SUPERADMIN:
    'No se puede deshabilitar la cuenta superadmin.',
  USERNAME_ALREADY_EXISTS:
    'El nombre de usuario ya está registrado.',
  EMAIL_ALREADY_EXISTS:
    'El email ya está registrado.',
  UNIQUE_CONSTRAINT_FAILED:
    'No se pudo procesar la creación del usuario.',
  HAS_RELATED_RECORDS:
    'No se puede eliminar el usuario porque tiene registros relacionados.',
});

export const USER_VALIDATION_MESSAGES = Object.freeze({
  USERNAME_REQUIRED: 'El nombre de usuario es obligatorio.',
  USERNAME_MUST_BE_STRING: 'El nombre de usuario debe ser texto.',
  USERNAME_NOT_EMPTY: 'El nombre de usuario no puede estar vacío.',
  USERNAME_TOO_LONG:
    'El nombre de usuario no puede superar 255 caracteres.',

  EMAIL_REQUIRED: 'El email es obligatorio.',
  EMAIL_MUST_BE_STRING: 'El email debe ser texto.',
  EMAIL_NOT_EMPTY: 'El email no puede estar vacío.',
  EMAIL_INVALID: 'El email no es válido.',
  EMAIL_TOO_LONG: 'El email no puede superar 255 caracteres.',

  PASSWORD_REQUIRED: 'La contraseña es obligatoria.',
  PASSWORD_MUST_BE_STRING: 'La contraseña debe ser texto.',
  PASSWORD_NOT_EMPTY: 'La contraseña no puede estar vacía.',
  PASSWORD_ONLY_SPACES:
    'La contraseña no puede contener solo espacios.',
  PASSWORD_TOO_LONG: 'La contraseña no puede superar 72 bytes.',

  ROLE_REQUIRED: 'El rol es obligatorio.',
  ROLE_MUST_BE_STRING: 'El rol debe ser texto.',
  ROLE_INVALID: 'El rol debe ser admin o regular.',

  ENABLED_MUST_BE_BOOLEAN:
    'Enabled debe ser true o false.',

  ID_MUST_BE_POSITIVE_INTEGER: 'El ID debe ser un entero positivo.',
  ID_INVALID: 'El ID no es válido.',

  PAGE_INVALID: 'Page debe ser un entero mayor o igual a 1.',
  LIMIT_INVALID: 'Limit debe ser un entero entre 1 y 100.',

  UPDATE_REQUIRES_FIELD: 'Enviá al menos un campo para actualizar.',
});

export const INVOICE_VALIDATION_MESSAGES = Object.freeze({
  TEXT: Object.freeze({
    number: Object.freeze({
      REQUIRED: 'number es obligatorio.',
      MUST_BE_STRING: 'number debe ser texto.',
      TOO_LONG: 'number no puede superar 255 caracteres.',
      NOT_EMPTY: 'number no puede estar vacío.',
    }),
    customerName: Object.freeze({
      REQUIRED: 'customerName es obligatorio.',
      MUST_BE_STRING: 'customerName debe ser texto.',
      TOO_LONG: 'customerName no puede superar 255 caracteres.',
      NOT_EMPTY: 'customerName no puede estar vacío.',
    }),
  }),
  AMOUNT_REQUIRED: 'amount es obligatorio.',
  AMOUNT_MUST_BE_STRING: 'amount debe ser texto decimal.',
  AMOUNT_INVALID: 'amount debe ser un decimal positivo de hasta 10 enteros y 2 decimales.',
  AMOUNT_NOT_POSITIVE: 'amount debe ser mayor que cero.',
  USER_ID_MUST_BE_INTEGER: 'userId debe ser un entero JSON.',
  USER_ID_INVALID: 'userId debe ser un entero positivo válido.',
  STATUS_INVALID: 'status no es válido.',
  ID_MUST_BE_POSITIVE_INTEGER: 'El ID debe ser un entero positivo.',
  ID_INVALID: 'El ID no es válido.',
  PAGE_INVALID: 'Page debe ser mayor o igual a 1.',
  LIMIT_INVALID: 'Limit debe estar entre 1 y 100.',
  UPDATE_REQUIRES_FIELD: 'Enviá al menos un campo para actualizar.',
});

export const REQUEST_ERROR_MESSAGES = Object.freeze({
  UNKNOWN_FIELD: 'Campo no permitido.',
  MALFORMED_JSON: 'El JSON enviado no es válido.',
  INTERNAL_SERVER_ERROR: 'Error interno del servidor.',
});

export const SERVER_MESSAGES = Object.freeze({
  API_LISTENING: (port) => `API listening on port ${port}`,
  DATABASE_INITIALIZATION_FAILED:
    'Database initialization failed.',
});
