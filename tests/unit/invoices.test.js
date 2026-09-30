import { describe, expect, test } from '@jest/globals';
import {
  invoiceTypeFor,
  toInvoiceCreationData,
} from '../../src/modules/invoices/support/invoices.mapper.js';
import {
  canReadInvoice,
  invoiceVisibility,
} from '../../src/modules/invoices/support/invoices.permissions.js';
import {
  assertCanRead,
  assertCanManage,
} from '../../src/modules/invoices/support/invoices.guards.js';
import {
  assertPendingDocument,
  assertCanAssignOwner,
} from '../../src/modules/documents/support/documents.guards.js';
import { assertClientTaxData } from '../../src/modules/clients/support/clients.guards.js';

const client = {
  name: 'Cliente',
  taxId: '123',
  country: 'AR',
  taxCondition: 'responsable_inscripto',
  address: 'Domicilio',
};
const order = {
  id: 1,
  clientId: 2,
  userId: 3,
  amount: '100.00',
  isExport: false,
};

describe('Reglas de facturación', () => {
  test.each([
    ['responsable_inscripto', 'A'],
    ['monotributista', 'A'],
    ['consumidor_final', 'B'],
    ['exento', 'B'],
  ])('venta local %s produce %s', (taxCondition, letter) => {
    expect(invoiceTypeFor(order, { ...client, taxCondition })).toBe(letter);
  });
  test('exportación usa E y un cliente extranjero no puede facturarse como venta local', () => {
    expect(
      invoiceTypeFor(
        { ...order, isExport: true },
        { ...client, country: 'UY', taxCondition: null },
      ),
    ).toBe('E');
    expect(() => invoiceTypeFor(order, { ...client, country: 'UY' })).toThrow();
    expect(() =>
      invoiceTypeFor(order, { ...client, taxCondition: null }),
    ).toThrow();
  });
  test('el snapshot y el importe provienen del cliente y la orden, no de campos inyectados', () => {
    const data = toInvoiceCreationData(
      { number: 'A-1', amount: '1', userId: 99, type: 'E' },
      order,
      client,
    );
    expect(data).toMatchObject({
      number: 'A-1',
      amount: '100.00',
      userId: 3,
      clientId: 2,
      documentId: 1,
      type: 'A',
      customerName: 'Cliente',
      customerTaxId: '123',
      status: 'issued',
    });
    expect(data.issuedAt).toBeInstanceOf(Date);
    client.name = 'Nuevo';
    expect(data.customerName).toBe('Cliente');
  });
  test('regular solo ve sus registros y no puede asignar dueños ni administrar facturas', () => {
    const actor = { role: 'regular', sub: '3' };
    expect(canReadInvoice(actor, order)).toBe(true);
    expect(canReadInvoice({ ...actor, sub: '4' }, order)).toBe(false);
    expect(invoiceVisibility(actor)).toEqual({ userId: 3 });
    expect(invoiceVisibility({ role: 'admin' })).toEqual({});
    expect(() => assertCanRead({ ...actor, sub: '4' }, order)).toThrow();
    expect(() => assertCanManage(actor)).toThrow();
    expect(() => assertCanAssignOwner(actor, { userId: 3 })).toThrow();
    expect(() => assertCanManage({ role: 'admin' })).not.toThrow();
  });
  test('órdenes facturadas/canceladas se bloquean y clientes locales requieren condición fiscal', () => {
    for (const status of ['invoiced', 'cancelled'])
      expect(() => assertPendingDocument({ status })).toThrow();
    expect(() => assertPendingDocument({ status: 'pending' })).not.toThrow();
    expect(() => assertClientTaxData({ country: 'AR' })).toThrow();
    expect(() => assertClientTaxData({ country: 'UY' })).not.toThrow();
  });
});
