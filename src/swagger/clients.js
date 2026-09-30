import {
  idSchema,
  textSchema,
  amountSchema,
  dateSchema,
  idParameter,
  paginationParameters,
  jsonResponse,
  billingResponses,
  requestBody,
  listSchema,
  contextSchema,
  withContext,
} from './billing-common.js';

const fields = {
  name: textSchema,
  taxId: { ...textSchema, maxLength: 32 },
  address: textSchema,
  country: { type: 'string', pattern: '^[A-Z]{2}$', default: 'AR' },
  taxCondition: {
    type: 'string',
    nullable: true,
    enum: [
      'responsable_inscripto',
      'monotributista',
      'consumidor_final',
      'exento',
      null,
    ],
  },
};
const security = [{ bearerAuth: [] }];

export const clientPaths = {
  '/clients': {
    get: {
      tags: ['Clients'],
      summary: 'Listar clientes',
      description:
        'Admin y regular pueden administrar todos los clientes. Los clientes argentinos requieren condición fiscal.',
      security,
      parameters: paginationParameters,
      responses: {
        ...billingResponses(400, 401, 500),
        200: jsonResponse('ClientListResponse', 'Listado paginado.'),
      },
    },
    post: {
      tags: ['Clients'],
      summary: 'Crear cliente',
      description:
        'Admin y regular pueden administrar todos los clientes. Los clientes argentinos requieren condición fiscal.',
      security,
      requestBody: requestBody('CreateClientRequest'),
      responses: {
        ...billingResponses(400, 401, 409, 500),
        201: jsonResponse('ClientContextResponse', 'Registro creado.'),
      },
    },
  },
  '/clients/{id}': {
    get: {
      tags: ['Clients'],
      summary: 'Consultar cliente',
      security,
      parameters: [idParameter],
      responses: {
        ...billingResponses(400, 401, 404, 500),
        200: jsonResponse('ClientContextResponse', 'Registro encontrado.'),
      },
    },
    patch: {
      tags: ['Clients'],
      summary: 'Editar cliente',
      description:
        'Admin y regular pueden administrar todos los clientes. Los clientes argentinos requieren condición fiscal.',
      security,
      parameters: [idParameter],
      requestBody: requestBody('UpdateClientRequest'),
      responses: {
        ...billingResponses(400, 401, 404, 409, 500),
        200: jsonResponse('ClientContextResponse', 'Registro actualizado.'),
      },
    },
    delete: {
      tags: ['Clients'],
      summary: 'Eliminar cliente',
      description:
        'Admin y regular pueden administrar todos los clientes. Los clientes argentinos requieren condición fiscal.',
      security,
      parameters: [idParameter],
      responses: {
        ...billingResponses(400, 401, 404, 409, 500),
        200: jsonResponse('ClientDeleteResponse', 'Registro eliminado.'),
      },
    },
  },
};

export const clientSchemas = {
  CreateClientRequest: {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'taxId', 'address'],
    properties: fields,
    description: 'country por defecto AR. Para AR, taxCondition es obligatorio y no admite null; para otros países es opcional.',
    oneOf: [
      {
        required: ['taxCondition'],
        properties: {
          country: { enum: ['AR'] },
          taxCondition: { type: 'string', enum: fields.taxCondition.enum.filter((value) => value !== null) },
        },
      },
      {
        required: ['country'],
        properties: { country: { not: { enum: ['AR'] } } },
      },
    ],
  },
  UpdateClientRequest: {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties: { ...fields },
    description: 'Los cambios se combinan con el cliente existente. Si el país resultante es AR, la condición fiscal resultante debe ser válida y no nula.',
  },
  ClientResponse: {
    type: 'object',
    additionalProperties: false,
    required: [
      'id',
      'name',
      'taxId',
      'address',
      'country',
      'taxCondition',
      'createdAt',
      'updatedAt',
    ],
    properties: {
      ...fields,
      id: idSchema,
      createdAt: dateSchema,
      updatedAt: dateSchema,
    },
  },
  ClientContext: contextSchema,
  ClientListResponse: withContext(listSchema('clients', 'ClientResponse'), 'ClientContext'),
};

clientSchemas.ClientContextResponse = withContext(clientSchemas.ClientResponse, 'ClientContext');
clientSchemas.ClientDeleteResponse = withContext({
  type: 'object',
  additionalProperties: false,
  required: ['message'],
  properties: { message: { type: 'string' } },
}, 'ClientContext');
