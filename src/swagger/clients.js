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
        201: jsonResponse('ClientResponse', 'Registro creado.'),
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
        200: jsonResponse('ClientResponse', 'Registro encontrado.'),
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
        200: jsonResponse('ClientResponse', 'Registro actualizado.'),
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
        204: { description: 'Registro eliminado, sin contenido.' },
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
  },
  UpdateClientRequest: {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties: { ...fields },
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
  ClientListResponse: listSchema('clients', 'ClientResponse'),
};
