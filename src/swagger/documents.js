import { DOCUMENT_TYPES } from '../constants/constants.js';
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
  number: textSchema,
  type: { type: 'string', enum: Object.values(DOCUMENT_TYPES), default: 'OV' },
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
        'Admin y regular acceden y operan sobre todos los documentos. Solo se modifican o eliminan documentos pendientes. Solo una OV pendiente puede facturarse. El estado invoiced se asigna al emitir una factura.',
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
        'Admin y regular acceden y operan sobre todos los documentos. Solo se modifican o eliminan documentos pendientes. Solo una OV pendiente puede facturarse. El estado invoiced se asigna al emitir una factura.',
      security,
      requestBody: requestBody('CreateDocumentRequest'),
      responses: {
        ...billingResponses(400, 401, 404, 409, 500),
        201: jsonResponse('DocumentContextResponse', 'Registro creado.'),
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
        200: jsonResponse('DocumentContextResponse', 'Registro encontrado.'),
      },
    },
    patch: {
      tags: ['Documents'],
      summary: 'Editar documento',
      description:
        'Admin y regular acceden y operan sobre todos los documentos. Solo se modifican o eliminan documentos pendientes. Solo una OV pendiente puede facturarse. El estado invoiced se asigna al emitir una factura.',
      security,
      parameters: [idParameter],
      requestBody: requestBody('UpdateDocumentRequest'),
      responses: {
        ...billingResponses(400, 401, 404, 409, 500),
        200: jsonResponse('DocumentContextResponse', 'Registro actualizado.'),
      },
    },
    delete: {
      tags: ['Documents'],
      summary: 'Eliminar documento',
      description:
        'Admin y regular acceden y operan sobre todos los documentos. Solo se modifican o eliminan documentos pendientes. Solo una OV pendiente puede facturarse. El estado invoiced se asigna al emitir una factura.',
      security,
      parameters: [idParameter],
      responses: {
        ...billingResponses(400, 401, 404, 409, 500),
        200: jsonResponse('DocumentDeleteResponse', 'Registro eliminado.'),
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
  DocumentContext: contextSchema,
  DocumentListResponse: withContext(listSchema('documents', 'DocumentResponse'), 'DocumentContext'),
};

documentSchemas.DocumentContextResponse = withContext(documentSchemas.DocumentResponse, 'DocumentContext');
documentSchemas.DocumentDeleteResponse = withContext({
  type: 'object',
  additionalProperties: false,
  required: ['message'],
  properties: { message: { type: 'string' } },
}, 'DocumentContext');
