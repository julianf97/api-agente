import { USER_ROLES } from '../constants/constants.js';
import {
  USERNAME_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_UTF8_BYTES,
  USER_ID_MAX,
  USERS_PAGE_LIMIT_MAX,
} from '../constants/validation-limits.js';

const userRoles = [USER_ROLES.REGULAR, USER_ROLES.ADMIN];

const assignableRoles = [USER_ROLES.REGULAR, USER_ROLES.ADMIN];

const userIdParameter = {
  name: 'id',
  in: 'path',
  required: true,
  schema: {
    type: 'integer',
    minimum: 1,
    maximum: USER_ID_MAX,
  },
  description: 'ID entero positivo sin ceros iniciales, hasta 2147483647.',
};

const validationErrorResponse = {
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ValidationErrorResponse' },
    },
  },
};

const errorResponse = {
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ErrorResponse' },
    },
  },
};

export const userPaths = {
  '/users': {
    get: {
      tags: ['Users'],
      summary: 'Listar usuarios',
      description: 'Solo admin. Permite administrar usuarios admin y regular.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'page',
          in: 'query',
          description: 'Número de página. Por defecto: 1.',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1,
          },
        },
        {
          name: 'limit',
          in: 'query',
          description: 'Usuarios por página. Por defecto: 20.',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: USERS_PAGE_LIMIT_MAX,
            default: 20,
          },
        },
      ],
      responses: {
        403: { description: 'Se requiere admin.', ...errorResponse },
        200: {
          description: 'Listado paginado de usuarios.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UserListResponse',
              },
            },
          },
        },
        400: {
          description: 'Los parámetros de paginación no son válidos.',
          ...validationErrorResponse,
        },
        401: {
          description:
            'Falta el token, es inválido o el usuario está deshabilitado.',
          ...errorResponse,
        },
        500: {
          description: 'Error interno del servidor.',
          ...errorResponse,
        },
      },
    },

    post: {
      tags: ['Users'],
      summary: 'Crear un usuario',
      description: 'Solo admin. Permite administrar usuarios admin y regular.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/CreateUserRequest',
            },
          },
        },
      },
      responses: {
        403: { description: 'Se requiere admin.', ...errorResponse },
        201: {
          description: 'Usuario creado.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UserResponse',
              },
            },
          },
        },
        400: {
          description: 'Los datos enviados no son válidos.',
          ...validationErrorResponse,
        },
        401: {
          description:
            'Falta el token, es inválido o el usuario está deshabilitado.',
          ...errorResponse,
        },
        403: {
          description:
            'El rol del solicitante no permite crear usuarios con el rol indicado.',
          ...errorResponse,
        },
        409: {
          description: 'El username o el email ya está registrado.',
          ...errorResponse,
        },
        500: {
          description: 'Error interno del servidor.',
          ...errorResponse,
        },
      },
    },
  },

  '/users/{id}': {
    get: {
      tags: ['Users'],
      summary: 'Obtener un usuario por ID',
      description: 'Solo admin. Permite administrar usuarios admin y regular.',
      security: [{ bearerAuth: [] }],
      parameters: [userIdParameter],
      responses: {
        403: { description: 'Se requiere admin.', ...errorResponse },
        200: {
          description: 'Usuario encontrado.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UserResponse',
              },
            },
          },
        },
        400: {
          description: 'El ID no es válido.',
          ...validationErrorResponse,
        },
        401: {
          description:
            'Falta el token, es inválido o el usuario está deshabilitado.',
          ...errorResponse,
        },
        404: {
          description: 'Usuario no encontrado.',
          ...errorResponse,
        },
        500: {
          description: 'Error interno del servidor.',
          ...errorResponse,
        },
      },
    },

    patch: {
      tags: ['Users'],
      summary: 'Editar los datos de un usuario',
      description: 'Solo admin. Permite administrar usuarios admin y regular.',
      security: [{ bearerAuth: [] }],
      parameters: [userIdParameter],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/UpdateUserRequest',
            },
          },
        },
      },
      responses: {
        403: { description: 'Se requiere admin.', ...errorResponse },
        200: {
          description: 'Usuario actualizado.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UserResponse',
              },
            },
          },
        },
        400: {
          description: 'El ID o los datos enviados no son válidos.',
          ...validationErrorResponse,
        },
        401: {
          description:
            'Falta el token, es inválido o el usuario está deshabilitado.',
          ...errorResponse,
        },
        403: {
          description:
            'Solo admin. Permite administrar usuarios admin y regular.',
          ...errorResponse,
        },
        404: {
          description: 'Usuario no encontrado.',
          ...errorResponse,
        },
        409: {
          description: 'El username o el email ya está registrado.',
          ...errorResponse,
        },
        500: {
          description: 'Error interno del servidor.',
          ...errorResponse,
        },
      },
    },

    delete: {
      tags: ['Users'],
      summary: 'Eliminar un usuario',
      description: 'Solo admin. Permite administrar usuarios admin y regular.',
      security: [{ bearerAuth: [] }],
      parameters: [userIdParameter],
      responses: {
        403: { description: 'Se requiere admin.', ...errorResponse },
        204: {
          description: 'Usuario eliminado. La respuesta no contiene un body.',
        },
        400: {
          description: 'El ID no es válido.',
          ...validationErrorResponse,
        },
        401: {
          description:
            'Falta el token, es inválido o el usuario está deshabilitado.',
          ...errorResponse,
        },
        403: {
          description: 'El solicitante no puede eliminar al usuario indicado.',
          ...errorResponse,
        },
        404: {
          description: 'Usuario no encontrado.',
          ...errorResponse,
        },
        409: {
          description:
            'No se puede eliminar el usuario porque tiene registros relacionados.',
          ...errorResponse,
        },
        500: {
          description: 'Error interno del servidor.',
          ...errorResponse,
        },
      },
    },
  },

  '/users/{id}/role': {
    patch: {
      tags: ['Users'],
      summary: 'Cambiar el rol de un usuario',
      description: 'Solo admin. Permite administrar usuarios admin y regular.',
      security: [{ bearerAuth: [] }],
      parameters: [userIdParameter],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ChangeUserRoleRequest',
            },
          },
        },
      },
      responses: {
        403: { description: 'Se requiere admin.', ...errorResponse },
        200: {
          description: 'Rol actualizado.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UserResponse',
              },
            },
          },
        },
        400: {
          description: 'El ID o el rol enviado no son válidos.',
          ...validationErrorResponse,
        },
        401: {
          description:
            'Falta el token, es inválido o el usuario está deshabilitado.',
          ...errorResponse,
        },
        403: {
          description:
            'Solo admin. Permite administrar usuarios admin y regular.',
          ...errorResponse,
        },
        404: {
          description: 'Usuario no encontrado.',
          ...errorResponse,
        },
        500: {
          description: 'Error interno del servidor.',
          ...errorResponse,
        },
      },
    },
  },
};

export const userSchemas = {
  CreateUserRequest: {
    type: 'object',
    additionalProperties: false,
    required: ['username', 'email', 'password'],
    properties: {
      username: {
        type: 'string',
        minLength: 1,
        pattern: '\\S',
        description:
          'Se eliminan espacios exteriores antes de validar: 1 a 255 caracteres y al menos uno no blanco.',
        'x-trim-before-validation': true,
        'x-maxLengthAfterTrim': USERNAME_MAX_LENGTH,
        example: 'newuser',
      },
      email: {
        type: 'string',
        pattern: '\\S',
        description:
          'Se eliminan espacios exteriores, se valida con express-validator isEmail y se limita a 255 caracteres después del recorte.',
        'x-trim-before-validation': true,
        'x-email-validator': 'express-validator isEmail',
        'x-maxLengthAfterTrim': EMAIL_MAX_LENGTH,
        example: 'newuser@example.com',
      },
      password: {
        type: 'string',
        minLength: 1,
        pattern: '\\S',
        format: 'password',
        writeOnly: true,
        description:
          'Debe contener un carácter no blanco y ocupar como máximo 72 bytes en UTF-8 (límite de bcrypt).',
        'x-maxUtf8Bytes': PASSWORD_MAX_UTF8_BYTES,
        example: 'contraseña123',
      },
      role: {
        type: 'string',
        enum: assignableRoles,
        default: USER_ROLES.REGULAR,
        example: USER_ROLES.REGULAR,
      },
    },
  },

  UpdateUserRequest: {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties: {
      username: {
        type: 'string',
        minLength: 1,
        pattern: '\\S',
        description:
          'Se eliminan espacios exteriores antes de validar: 1 a 255 caracteres y al menos uno no blanco.',
        'x-trim-before-validation': true,
        'x-maxLengthAfterTrim': USERNAME_MAX_LENGTH,
        example: 'usuario_actualizado',
      },
      email: {
        type: 'string',
        pattern: '\\S',
        description:
          'Se eliminan espacios exteriores, se valida con express-validator isEmail y se limita a 255 caracteres después del recorte.',
        'x-trim-before-validation': true,
        'x-email-validator': 'express-validator isEmail',
        'x-maxLengthAfterTrim': EMAIL_MAX_LENGTH,
        example: 'usuario.actualizado@example.com',
      },
      password: {
        type: 'string',
        minLength: 1,
        pattern: '\\S',
        format: 'password',
        writeOnly: true,
        description:
          'Debe contener un carácter no blanco y ocupar como máximo 72 bytes en UTF-8 (límite de bcrypt).',
        'x-maxUtf8Bytes': PASSWORD_MAX_UTF8_BYTES,
        example: 'nuevaContraseña123',
      },
      enabled: {
        type: 'boolean',
        description: 'Indica si el usuario puede iniciar sesión.',
        example: true,
      },
    },
  },

  ChangeUserRoleRequest: {
    type: 'object',
    additionalProperties: false,
    required: ['role'],
    properties: {
      role: {
        type: 'string',
        enum: assignableRoles,
        example: USER_ROLES.ADMIN,
      },
    },
  },

  UserResponse: {
    type: 'object',
    additionalProperties: false,
    required: [
      'id',
      'username',
      'email',
      'role',
      'enabled',
      'createdAt',
      'updatedAt',
    ],
    properties: {
      id: {
        type: 'integer',
        example: 1,
      },
      username: {
        type: 'string',
        example: 'newuser',
      },
      email: {
        type: 'string',
        format: 'email',
        example: 'newuser@example.com',
      },
      role: {
        type: 'string',
        enum: userRoles,
        example: USER_ROLES.REGULAR,
      },
      enabled: {
        type: 'boolean',
        example: true,
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
      },
    },
  },

  UserListResponse: {
    type: 'object',
    additionalProperties: false,
    required: ['users', 'pagination'],
    properties: {
      users: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/UserResponse',
        },
      },
      pagination: {
        type: 'object',
        additionalProperties: false,
        required: ['total', 'page', 'limit', 'totalPages'],
        properties: {
          total: {
            type: 'integer',
            example: 34,
          },
          page: {
            type: 'integer',
            example: 1,
          },
          limit: {
            type: 'integer',
            example: 20,
          },
          totalPages: {
            type: 'integer',
            example: 2,
          },
        },
      },
    },
  },
};
