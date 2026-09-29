import { INVOICE_STATUSES } from '../constants/constants.js';
import { USER_ID_MAX, USERS_PAGE_LIMIT_MAX } from '../constants/validation-limits.js';

const json = (schema) => ({ content: { 'application/json': { schema: { $ref: `#/components/schemas/${schema}` } } } });
const error = (description, schema = 'ErrorResponse') => ({ description, ...json(schema) });
const id = { name: 'id', in: 'path', required: true, description: 'ID positivo de factura, sin ceros iniciales.',
  schema: { type: 'integer', minimum: 1, maximum: USER_ID_MAX } };
const body = (schema) => ({ required: true, content: { 'application/json': {
  schema: { $ref: `#/components/schemas/${schema}` },
} } });

export const invoicePaths = {
  '/invoices': {
    get: {
      tags: ['Invoices'], summary: 'Listar facturas',
      description: 'Admin y superadmin ven todas; regular solo ve las facturas cuyo userId coincide con su cuenta.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: USERS_PAGE_LIMIT_MAX, default: 20 } },
      ],
      responses: {
        200: error('Listado paginado.', 'InvoiceListResponse'),
        400: error('Paginación inválida.', 'ValidationErrorResponse'),
        401: error('Token ausente, inválido o usuario deshabilitado.'),
        500: error('Error interno.'),
      },
    },
    post: {
      tags: ['Invoices'], summary: 'Crear factura',
      description: 'Regular crea solo borradores propios y no envía userId. Admin y superadmin pueden asignar userId y estado. issuedAt se fija automáticamente al emitir o marcar pagada.',
      security: [{ bearerAuth: [] }], requestBody: body('CreateInvoiceRequest'),
      responses: {
        201: error('Factura creada.', 'InvoiceResponse'),
        400: error('Datos inválidos.', 'ValidationErrorResponse'),
        401: error('Token ausente o inválido.'),
        403: error('Operación no permitida para regular.'),
        404: error('Usuario asignado inexistente.'),
        409: error('Número de factura duplicado.'),
        500: error('Error interno.'),
      },
    },
  },
  '/invoices/{id}': {
    get: {
      tags: ['Invoices'], summary: 'Obtener factura',
      description: 'Regular solo puede consultar sus propias facturas; otras facturas responden 404.',
      security: [{ bearerAuth: [] }], parameters: [id],
      responses: {
        200: error('Factura encontrada.', 'InvoiceResponse'),
        400: error('ID inválido.', 'ValidationErrorResponse'),
        401: error('Token ausente o inválido.'),
        404: error('Factura inexistente o ajena.'),
        500: error('Error interno.'),
      },
    },
    patch: {
      tags: ['Invoices'], summary: 'Editar factura',
      description: 'Regular solo edita número, cliente e importe de un borrador propio. Admin y superadmin pueden modificar cualquier factura, incluido dueño y estado. issuedAt se fija al pasar por primera vez a issued o paid.',
      security: [{ bearerAuth: [] }], parameters: [id], requestBody: body('UpdateInvoiceRequest'),
      responses: {
        200: error('Factura actualizada.', 'InvoiceResponse'),
        400: error('ID o datos inválidos.', 'ValidationErrorResponse'),
        401: error('Token ausente o inválido.'),
        403: error('Edición no permitida.'),
        404: error('Factura ajena/inexistente o usuario asignado inexistente.'),
        409: error('Número de factura duplicado.'),
        500: error('Error interno.'),
      },
    },
    delete: {
      tags: ['Invoices'], summary: 'Eliminar factura',
      description: 'Solo admin y superadmin. La respuesta no tiene cuerpo.',
      security: [{ bearerAuth: [] }], parameters: [id],
      responses: {
        204: { description: 'Factura eliminada.' },
        400: error('ID inválido.', 'ValidationErrorResponse'),
        401: error('Token ausente o inválido.'),
        403: error('Se requiere admin o superadmin.'),
        404: error('Factura no encontrada.'),
        500: error('Error interno.'),
      },
    },
  },
};

const editable = {
  number: { type: 'string', minLength: 1, maxLength: 255, pattern: '\\S', description: 'Se recortan espacios exteriores.' },
  customerName: { type: 'string', minLength: 1, maxLength: 255, pattern: '\\S', description: 'Se recortan espacios exteriores.' },
  amount: { type: 'string', pattern: '^(?!0(?:\\.0{1,2})?$)(?:0|[1-9]\\d{0,9})(?:\\.\\d{1,2})?$',
    description: 'Decimal positivo, máximo 10 enteros y 2 decimales.' },
  userId: { type: 'integer', minimum: 1, maximum: USER_ID_MAX, description: 'Solo admin y superadmin pueden enviarlo.' },
  status: { type: 'string', enum: Object.values(INVOICE_STATUSES), description: 'Regular solo puede omitirlo o usar draft al crear; no puede editarlo.' },
};
export const invoiceSchemas = {
  CreateInvoiceRequest: { type: 'object', additionalProperties: false,
    required: ['number', 'customerName', 'amount'], properties: editable },
  UpdateInvoiceRequest: { type: 'object', additionalProperties: false,
    minProperties: 1, properties: editable },
  InvoiceResponse: { type: 'object', additionalProperties: false,
    required: ['id', 'number', 'userId', 'customerName', 'amount', 'status', 'issuedAt', 'createdAt', 'updatedAt'],
    properties: {
      id: { type: 'integer' }, number: { type: 'string' }, userId: { type: 'integer' },
      customerName: { type: 'string' }, amount: { type: 'string' },
      status: { type: 'string', enum: Object.values(INVOICE_STATUSES) },
      issuedAt: { type: 'string', format: 'date-time', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  InvoiceListResponse: { type: 'object', additionalProperties: false, required: ['invoices', 'pagination'],
    properties: {
      invoices: { type: 'array', items: { $ref: '#/components/schemas/InvoiceResponse' } },
      pagination: { type: 'object', additionalProperties: false,
        required: ['total', 'page', 'limit', 'totalPages'],
        properties: {
          total: { type: 'integer' }, page: { type: 'integer' },
          limit: { type: 'integer' }, totalPages: { type: 'integer' },
        },
      },
    },
  },
};
