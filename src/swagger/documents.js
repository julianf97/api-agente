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
  number: textSchema,
  type: { type: 'string', enum: ['OV'], default: 'OV' },
  userId: idSchema,
  clientId: idSchema,
  amount: amountSchema,
  isExport: { type: 'boolean', default: false },
};
const security = [{ bearerAuth: [] }];

export const documentPaths = {
  '/documents': {
    get: {
      tags: ['Documents'],
      summary: 'Listar documentos',
      description:
        'Admin y regular acceden y operan sobre todas las órdenes. Solo se modifican o eliminan órdenes pendientes. El estado invoiced se asigna al emitir una factura.',
      security,
      parameters: paginationParameters,
      responses: {
        ...billingResponses(400, 401, 500),
        200: jsonResponse('DocumentListResponse', 'Listado paginado.'),
      },
    },
    post: {
      tags: ['Documents'],
      summary: 'Crear documento',
      description:
        'Admin y regular acceden y operan sobre todas las órdenes. Solo se modifican o eliminan órdenes pendientes. El estado invoiced se asigna al emitir una factura.',
      security,
      requestBody: requestBody('CreateDocumentRequest'),
      responses: {
        ...billingResponses(400, 401, 404, 409, 500),
        201: jsonResponse('DocumentResponse', 'Registro creado.'),
      },
    },
  },
  '/documents/{id}': {
    get: {
      tags: ['Documents'],
      summary: 'Consultar documento',
      security,
      parameters: [idParameter],
      responses: {
        ...billingResponses(400, 401, 404, 500),
        200: jsonResponse('DocumentResponse', 'Registro encontrado.'),
      },
    },
    patch: {
      tags: ['Documents'],
      summary: 'Editar documento',
      description:
        'Admin y regular acceden y operan sobre todas las órdenes. Solo se modifican o eliminan órdenes pendientes. El estado invoiced se asigna al emitir una factura.',
      security,
      parameters: [idParameter],
      requestBody: requestBody('UpdateDocumentRequest'),
      responses: {
        ...billingResponses(400, 401, 404, 409, 500),
        200: jsonResponse('DocumentResponse', 'Registro actualizado.'),
      },
    },
    delete: {
      tags: ['Documents'],
      summary: 'Eliminar documento',
      description:
        'Admin y regular acceden y operan sobre todas las órdenes. Solo se modifican o eliminan órdenes pendientes. El estado invoiced se asigna al emitir una factura.',
      security,
      parameters: [idParameter],
      responses: {
        ...billingResponses(400, 401, 404, 409, 500),
        204: { description: 'Registro eliminado, sin contenido.' },
      },
    },
  },
};

export const documentSchemas = {
  CreateDocumentRequest: {
    type: 'object',
    additionalProperties: false,
    required: ['number', 'clientId', 'amount'],
    properties: fields,
  },
  UpdateDocumentRequest: {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties: { ...fields, status: { type: 'string', enum: ['cancelled'] } },
  },
  DocumentResponse: {
    type: 'object',
    additionalProperties: false,
    required: [
      'id',
      'number',
      'type',
      'userId',
      'clientId',
      'amount',
      'isExport',
      'status',
      'issuedAt',
      'createdAt',
      'updatedAt',
    ],
    properties: {
      ...fields,
      id: idSchema,
      createdAt: dateSchema,
      updatedAt: dateSchema,
      status: { type: 'string', enum: ['pending', 'invoiced', 'cancelled'] },
      issuedAt: { ...dateSchema, nullable: true },
    },
  },
  DocumentListResponse: listSchema('documents', 'DocumentResponse'),
};
