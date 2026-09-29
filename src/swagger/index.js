import swaggerUi from 'swagger-ui-express';
import { userPaths, userSchemas } from './users.js';
import { invoicePaths, invoiceSchemas } from './invoices.js';

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
            ...validationErrorResponse,
          },
          401: {
            description:
              'Credenciales inválidas o usuario deshabilitado.',
            ...errorResponse,
          },
          500: {
            description: 'Error interno del servidor.',
            ...errorResponse,
          },
        },
      },
    },

    ...userPaths,
    ...invoicePaths,
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
      ValidationErrorResponse: {
        type: 'object',
        additionalProperties: false,
        required: ['errors'],
        properties: {
          errors: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['field', 'message'],
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },

      ErrorResponse: {
        type: 'object',
        additionalProperties: false,
        required: ['error'],
        properties: {
          error: { type: 'string' },
        },
      },

      LoginRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            pattern: '\\S',
            description: 'Se eliminan espacios exteriores y luego se valida con express-validator isEmail; no puede quedar vacío.',
            'x-trim-before-validation': true,
            'x-email-validator': 'express-validator isEmail',
            example: 'admin-user@gmail.com',
          },
          password: {
            type: 'string',
            format: 'password',
            minLength: 1,
            writeOnly: true,
          },
        },
      },

      LoginResponse: {
        type: 'object',
        additionalProperties: false,
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

      ...userSchemas,
      ...invoiceSchemas,
    },
  },
};

export default function registerSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
}
