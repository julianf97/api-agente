import swaggerUi from 'swagger-ui-express';

const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'API Agent',
    version: '1.0.0',
    description: 'API de demostración del ERP.',
  },
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Iniciar sesión',
        description: 'Devuelve un token si el email y la contraseña son correctos.',
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
            description: 'Credenciales inválidas.',
          },
          500: {
            description: 'Error interno del servidor.',
          },
        },
      },
    },

    '/users': {
      post: {
        tags: ['Users'],
        summary: 'Crear un usuario',
        description:
          'Requiere un token de administrador. Guarda la contraseña como hash. Si no se envía un rol, el modelo asigna regular.',
        security: [
          {
            bearerAuth: [],
          },
        ],
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
            description: 'Falta el token o el token no es válido.',
          },
          403: {
            description: 'El usuario autenticado no tiene rol admin.',
          },
          409: {
            description: 'El username o el email ya está registrado.',
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
            description: 'JWT para enviar en el encabezado Authorization.',
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
            enum: ['admin', 'regular'],
            default: 'regular',
            example: 'regular',
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
            enum: ['admin', 'regular'],
            example: 'regular',
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
    },
  },
};

export default function registerSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
}