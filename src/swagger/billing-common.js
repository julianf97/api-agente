export const idSchema = { type: 'integer', minimum: 1, maximum: 2147483647 };
export const textSchema = {
  type: 'string',
  minLength: 1,
  maxLength: 255,
  pattern: '\\S',
};
export const amountSchema = {
  type: 'string',
  pattern: '^(?!0(?:\\.0{1,2})?$)(?:0|[1-9]\\d{0,9})(?:\\.\\d{1,2})?$',
};
export const dateSchema = { type: 'string', format: 'date-time' };
export const idParameter = {
  name: 'id',
  in: 'path',
  required: true,
  schema: idSchema,
};
export const paginationParameters = [
  {
    name: 'page',
    in: 'query',
    schema: { type: 'integer', minimum: 1, default: 1 },
  },
  {
    name: 'limit',
    in: 'query',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
  },
];

export function jsonResponse(schema, description) {
  return {
    description,
    content: {
      'application/json': {
        schema: { $ref: `#/components/schemas/${schema}` },
      },
    },
  };
}

export const billingErrors = {
  400: jsonResponse('ValidationErrorResponse', 'Entrada inválida.'),
  401: jsonResponse('ErrorResponse', 'Token inválido o usuario no disponible.'),
  403: jsonResponse('ErrorResponse', 'Permisos insuficientes.'),
  404: jsonResponse('ErrorResponse', 'Registro no encontrado.'),
  409: jsonResponse(
    'ErrorResponse',
    'Conflicto de unicidad, referencias o estado.',
  ),
  500: jsonResponse('ErrorResponse', 'Error interno del servidor.'),
};

export function requestBody(schema) {
  return {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: `#/components/schemas/${schema}` },
      },
    },
  };
}

export function listSchema(resource, item) {
  return {
    type: 'object',
    additionalProperties: false,
    required: [resource, 'pagination'],
    properties: {
      [resource]: {
        type: 'array',
        items: { $ref: `#/components/schemas/${item}` },
      },
      pagination: { $ref: '#/components/schemas/Pagination' },
    },
  };
}

export function billingResponses(...statuses) {
  return Object.fromEntries(
    statuses.map((status) => [status, billingErrors[status]]),
  );
}
