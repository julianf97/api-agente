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

const security = [{ bearerAuth: [] }];
export const invoicePaths = {
  '/invoices': {
    get: {
      tags: ['Invoices'],
      summary: 'Listar facturas',
      security,
      parameters: paginationParameters,
      description: 'Admin consulta todas; regular solo las propias.',
      responses: {
        ...billingResponses(400, 401, 500),
        200: jsonResponse('InvoiceListResponse', 'Listado paginado.'),
      },
    },
    post: {
      tags: ['Invoices'],
      summary: 'Facturar una orden de venta',
      security,
      description:
        'Una orden pendiente genera una única factura. E para exportación; A para responsables inscriptos o monotributistas; B para consumidores finales o exentos. Importe, dueño y cliente se toman de la orden. Se guardan los datos fiscales del cliente al emitir. Demo sin autorización fiscal de ARCA.',
      requestBody: requestBody('CreateInvoiceRequest'),
      responses: {
        ...billingResponses(400, 401, 404, 409, 500),
        201: jsonResponse(
          'InvoiceResponse',
          'Factura emitida y orden marcada invoiced, en una transacción.',
        ),
      },
    },
  },
  '/invoices/{id}': {
    get: {
      tags: ['Invoices'],
      summary: 'Consultar factura',
      security,
      parameters: [idParameter],
      responses: {
        ...billingResponses(400, 401, 404, 500),
        200: jsonResponse('InvoiceResponse', 'Factura encontrada.'),
      },
    },
    patch: {
      tags: ['Invoices'],
      summary: 'Marcar factura pagada o cancelada',
      security,
      parameters: [idParameter],
      description:
        'Solo admin. No modifica el origen, importe ni los datos fiscales históricos. Una factura cancelada no se modifica.',
      requestBody: requestBody('UpdateInvoiceRequest'),
      responses: {
        ...billingResponses(400, 401, 403, 404, 409, 500),
        200: jsonResponse('InvoiceResponse', 'Estado actualizado.'),
      },
    },
    delete: {
      tags: ['Invoices'],
      summary: 'Solicitar eliminación de factura',
      security,
      parameters: [idParameter],
      description:
        'Solo admin. Las facturas emitidas se conservan; devuelve 409. Para anular, usar PATCH con status cancelled.',
      responses: billingResponses(400, 401, 403, 404, 409, 500),
    },
  },
};

export const invoiceSchemas = {
  CreateInvoiceRequest: {
    type: 'object',
    additionalProperties: false,
    required: ['number', 'documentId'],
    properties: { number: textSchema, documentId: idSchema },
  },
  UpdateInvoiceRequest: {
    type: 'object',
    additionalProperties: false,
    required: ['status'],
    properties: { status: { type: 'string', enum: ['paid', 'cancelled'] } },
  },
  InvoiceResponse: {
    type: 'object',
    additionalProperties: false,
    required: [
      'id',
      'number',
      'documentId',
      'clientId',
      'userId',
      'type',
      'customerName',
      'customerTaxId',
      'customerTaxCondition',
      'customerCountry',
      'customerAddress',
      'amount',
      'status',
      'issuedAt',
      'createdAt',
      'updatedAt',
    ],
    properties: {
      id: idSchema,
      number: textSchema,
      documentId: idSchema,
      clientId: idSchema,
      userId: idSchema,
      type: { type: 'string', enum: ['A', 'B', 'E'] },
      customerName: textSchema,
      customerTaxId: { ...textSchema, maxLength: 32 },
      customerTaxCondition: { type: 'string', nullable: true },
      customerCountry: { type: 'string', pattern: '^[A-Z]{2}$' },
      customerAddress: textSchema,
      amount: amountSchema,
      status: {
        type: 'string',
        enum: ['draft', 'issued', 'paid', 'cancelled'],
      },
      issuedAt: dateSchema,
      createdAt: dateSchema,
      updatedAt: dateSchema,
    },
  },
  InvoiceListResponse: listSchema('invoices', 'InvoiceResponse'),
};
