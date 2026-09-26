import swaggerUi from 'swagger-ui-express';

const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'API Agent',
    version: '1.0.0',
    description: 'Minimal Express API foundation.',
  },
  paths: {
    '/': {
      get: {
        summary: 'Get the API status',
        responses: {
          200: {
            description: 'The API is available.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['message'],
                  properties: {
                    message: {
                      type: 'string',
                      example: 'API is running',
                    },
                  },
                },
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
