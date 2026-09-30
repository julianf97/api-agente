import { beforeEach, expect, jest, test } from '@jest/globals';

const findDocumentForInvoice = jest.fn();
const findInvoiceClient = jest.fn();
const createInvoice = jest.fn();
const updateInvoiceDocument = jest.fn();
const transaction = {};
jest.unstable_mockModule('../../src/modules/invoices/invoices.repository.js', () => ({
  findInvoices: jest.fn(),
  inInvoiceTransaction: (callback) => callback(transaction),
  findDocumentForInvoice,
  findInvoiceClient,
  createInvoice,
  updateInvoiceDocument,
  updateInvoice: jest.fn(),
}));
jest.unstable_mockModule('../../src/modules/invoices/support/find-existing-invoice.js', () => ({
  findExistingInvoice: jest.fn(),
}));
const { addInvoice } = await import('../../src/modules/invoices/invoices.service.js');

beforeEach(() => jest.clearAllMocks());

test.each(['OC', 'PR', 'RE', 'NC'])('%s pending cannot create an invoice or change the document', async (type) => {
  findDocumentForInvoice.mockResolvedValue({ id: 1, type, status: 'pending' });
  await expect(addInvoice({ number: 'F-1', documentId: 1 })).rejects.toMatchObject({
    status: 409, message: 'Solo se pueden facturar documentos de tipo OV.',
  });
  expect(findInvoiceClient).not.toHaveBeenCalled();
  expect(createInvoice).not.toHaveBeenCalled();
  expect(updateInvoiceDocument).not.toHaveBeenCalled();
});

test('OV pending keeps the existing invoicing flow', async () => {
  const document = { id: 1, type: 'OV', status: 'pending', clientId: 2, userId: 3, amount: '100.00', isExport: false };
  findDocumentForInvoice.mockResolvedValue(document);
  findInvoiceClient.mockResolvedValue({ name: 'Cliente', taxId: '123', taxCondition: 'consumidor_final', country: 'AR', address: 'Mitre 1' });
  createInvoice.mockResolvedValue({ id: 4, documentId: 1, type: 'B' });
  await expect(addInvoice({ number: 'F-1', documentId: 1 })).resolves.toMatchObject({ type: 'B', documentId: 1 });
  expect(createInvoice).toHaveBeenCalledWith(expect.objectContaining({ number: 'F-1', documentId: 1, amount: '100.00', type: 'B' }), transaction);
  expect(updateInvoiceDocument).toHaveBeenCalledWith(document, { status: 'invoiced' }, transaction);
});
