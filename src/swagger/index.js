import swaggerUi from 'swagger-ui-express';
import { USER_ROLES } from '../constants/constants.js';

const userRoles = [
  USER_ROLES.REGULAR,
  USER_ROLES.ADMIN,
  USER_ROLES.SUPERADMIN,
];

const assignableRoles = [
  USER_ROLES.REGULAR,
  USER_ROLES.ADMIN,
];

const userIdParameter = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'ID del usuario.',
  schema: {
    type: 'integer',
    minimum: 1,
    maximum: 2147483647,
  },
};

export const openApiDocument = {
  openapi: '3.0.3',

  info: {
    title: 'DEMO Sicorp',
    version: '1.0.0',
    description:
      'API de demostración con datos ficticios de usuarios y facturas para evaluar la automatización de procesos mediante agentes de IA.',
  },

  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Iniciar sesión',
        description:
          'Devuelve un token si las credenciales son correctas y el usuario está habilitado.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/LoginRequest',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Inicio de sesión exitoso.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LoginResponse',
                },
              },
            },
          },
          400: {
            description: 'Los datos enviados no son válidos.',
          },
          401: {
            description:
              'Credenciales inválidas o usuario deshabilitado.',
          },
          500: {
            description: 'Error interno del servidor.',
          },
        },
      },
    },

    '/users': {
      get: {
        tags: ['Users'],
        summary: 'Listar usuarios',
        description:
          'Disponible para regular, admin y superadmin. Incluye usuarios habilitados y deshabilitados.',
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
              maximum: 100,
              default: 20,
            },
          },
        ],
        responses: {
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
            description:
              'Los parámetros de paginación no son válidos.',
          },
          401: {
            description:
              'Falta el token, es inválido o el usuario está deshabilitado.',
          },
          500: {
            description: 'Error interno del servidor.',
          },
        },
      },

      post: {
        tags: ['Users'],
        summary: 'Crear un usuario',
        description:
          'Admin puede crear usuarios regular. Superadmin puede crear usuarios regular o admin. No se puede crear otro superadmin. La contraseña se guarda como hash; el usuario se crea habilitado y el rol predeterminado es regular.',
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
          },
          401: {
            description:
              'Falta el token, es inválido o el usuario está deshabilitado.',
          },
          403: {
            description:
              'El rol del solicitante no permite crear usuarios con el rol indicado.',
          },
          409: {
            description:
              'El username o el email ya está registrado.',
          },
          500: {
            description: 'Error interno del servidor.',
          },
        },
      },
    },

    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Obtener un usuario por ID',
        description:
          'Disponible para regular, admin y superadmin. También permite consultar usuarios deshabilitados.',
        security: [{ bearerAuth: [] }],
        parameters: [userIdParameter],
        responses: {
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
          },
          401: {
            description:
              'Falta el token, es inválido o el usuario está deshabilitado.',
          },
          404: {
            description: 'Usuario no encontrado.',
          },
          500: {
            description: 'Error interno del servidor.',
          },
        },
      },

      patch: {
        tags: ['Users'],
        summary: 'Editar los datos de un usuario',
        description:
          'Admin solo puede editar usuarios regular. Superadmin puede editar usuarios regular y admin, además de sus propios datos. Esta operación no cambia el rol. Permite modificar el estado enabled, excepto deshabilitar la cuenta superadmin.',
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
            description:
              'El ID o los datos enviados no son válidos.',
          },
          401: {
            description:
              'Falta el token, es inválido o el usuario está deshabilitado.',
          },
          403: {
            description:
              'El solicitante no puede editar al usuario indicado o se intentó deshabilitar la cuenta superadmin.',
          },
          404: {
            description: 'Usuario no encontrado.',
          },
          409: {
            description:
              'El username o el email ya está registrado.',
          },
          500: {
            description: 'Error interno del servidor.',
          },
        },
      },

      delete: {
        tags: ['Users'],
        summary: 'Eliminar físicamente un usuario',
        description:
          'Admin solo puede eliminar usuarios regular. Superadmin puede eliminar usuarios regular y admin. La cuenta superadmin no se puede eliminar. Un usuario con registros relacionados, como facturas, no se puede eliminar.',
        security: [{ bearerAuth: [] }],
        parameters: [userIdParameter],
        responses: {
          204: {
            description:
              'Usuario eliminado. La respuesta no contiene un body.',
          },
          400: {
            description: 'El ID no es válido.',
          },
          401: {
            description:
              'Falta el token, es inválido o el usuario está deshabilitado.',
          },
          403: {
            description:
              'El solicitante no puede eliminar al usuario indicado.',
          },
          404: {
            description: 'Usuario no encontrado.',
          },
          409: {
            description:
              'No se puede eliminar el usuario porque tiene registros relacionados.',
          },
          500: {
            description: 'Error interno del servidor.',
          },
        },
      },
    },

    '/users/{id}/role': {
      patch: {
        tags: ['Users'],
        summary: 'Cambiar el rol de un usuario',
        description:
          'Exclusivo de superadmin. Permite cambiar entre regular y admin. No permite modificar el rol de la cuenta superadmin ni asignar superadmin a otra cuenta.',
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
            description:
              'El ID o el rol enviado no son válidos.',
          },
          401: {
            description:
              'Falta el token, es inválido o el usuario está deshabilitado.',
          },
          403: {
            description:
              'Se requiere superadmin o se intentó cambiar el rol de la cuenta superadmin.',
          },
          404: {
            description: 'Usuario no encontrado.',
          },
          500: {
            description: 'Error interno del servidor.',
          },
        },
      },
    },
  },

  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },

    schemas: {
      LoginRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'admin-user@gmail.com',
          },
          password: {
            type: 'string',
            format: 'password',
            writeOnly: true,
          },
        },
      },

      LoginResponse: {
        type: 'object',
        required: ['accessToken', 'tokenType', 'expiresIn'],
        properties: {
          accessToken: {
            type: 'string',
            description:
              'JWT para enviar en el encabezado Authorization.',
          },
          tokenType: {
            type: 'string',
            example: 'Bearer',
          },
          expiresIn: {
            type: 'integer',
            description: 'Duración del token en segundos.',
            example: 3600,
          },
        },
      },

      CreateUserRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['username', 'email', 'password'],
        properties: {
          username: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
            example: 'newuser',
          },
          email: {
            type: 'string',
            format: 'email',
            maxLength: 255,
            example: 'newuser@example.com',
          },
          password: {
            type: 'string',
            minLength: 1,
            format: 'password',
            writeOnly: true,
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
            maxLength: 255,
            example: 'usuario_actualizado',
          },
          email: {
            type: 'string',
            format: 'email',
            maxLength: 255,
            example: 'usuario.actualizado@example.com',
          },
          password: {
            type: 'string',
            minLength: 1,
            format: 'password',
            writeOnly: true,
            example: 'nuevaContraseña123',
          },
          enabled: {
            type: 'boolean',
            description:
              'Indica si el usuario puede iniciar sesión.',
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
            required: [
              'total',
              'page',
              'limit',
              'totalPages',
            ],
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
    },
  },
};

export default function registerSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
}
