import { describe, expect, test } from '@jest/globals';
import express from 'express';
import Ajv from 'ajv';
import { UniqueConstraintError } from 'sequelize';
import { openApiDocument } from '../../src/swagger/index.js';
import { createInvoiceValidation } from '../../src/modules/invoices/validators/createInvoice.validator.js';
import { updateInvoiceValidation } from '../../src/modules/invoices/validators/updateInvoice.validator.js';
import { listInvoicesValidation } from '../../src/modules/invoices/validators/listInvoices.validator.js';
import {
  canReadInvoice, canEditInvoice, canCreateInvoice, canUpdateInvoice,
  invoiceVisibility, isInvoiceManager,
} from '../../src/modules/invoices/invoices.permissions.js';
import { assertCanCreate, assertCanUpdate } from '../../src/modules/invoices/invoices.guards.js';
import {
  toInvoiceCreationData, toInvoiceUpdateData,
} from '../../src/modules/invoices/invoices.mapper.js';
import { handleInvoiceNumberConflict } from '../../src/errors/invoice-number-conflict-error.js';
import { handleValidation } from '../../src/middleweres/handle-validation.js';

describe('Facturas: permisos y contrato de entrada', () => {
  test('permisos por dueño, estado y rol', () => {
    const regular = { sub: '1', role: 'regular' };
    const other = { sub: '2', role: 'regular' };
    const admin = { sub: '2', role: 'admin' };
    const superadmin = { sub: '2', role: 'superadmin' };
    const draft = { userId: 1, status: 'draft' };
    expect(isInvoiceManager(regular)).toBe(false);
    expect(canReadInvoice(regular, draft)).toBe(true);
    expect(canEditInvoice(regular, draft)).toBe(true);
    expect(canReadInvoice(other, draft)).toBe(false);
    expect(canEditInvoice(other, draft)).toBe(false);
    for (const status of ['issued', 'paid', 'cancelled']) {
      expect(canReadInvoice(regular, { ...draft, status })).toBe(true);
      expect(canEditInvoice(regular, { ...draft, status })).toBe(false);
    }
    for (const actor of [admin, superadmin]) {
      expect(isInvoiceManager(actor)).toBe(true);
      expect(canReadInvoice(actor, draft)).toBe(true);
      expect(canEditInvoice(actor, draft)).toBe(true);
    }
  });

  test('creación y actualización separan permisos de preparación de datos', () => {
    const regular = { sub: '1', role: 'regular' };
    const admin = { sub: '2', role: 'admin' };
    const draft = { userId: 1, status: 'draft', issuedAt: null };
    const data = { number: 'F-1', customerName: 'Cliente', amount: '25.00' };

    expect(invoiceVisibility(regular)).toEqual({ userId: 1 });
    expect(invoiceVisibility(admin)).toEqual({});
    expect(canCreateInvoice(regular, { ...data, status: 'draft' })).toBe(true);
    expect(canCreateInvoice(regular, { ...data, userId: 2 })).toBe(false);
    expect(canCreateInvoice(regular, { ...data, status: 'issued' })).toBe(false);
    expect(canUpdateInvoice(regular, { amount: '50.00' })).toBe(true);
    expect(canUpdateInvoice(regular, { status: 'paid' })).toBe(false);
    expect(() => assertCanCreate(regular, { ...data, userId: 2 })).toThrow();
    expect(() => assertCanUpdate(regular, draft, { status: 'issued' })).toThrow();
    expect(() => assertCanUpdate(regular, { ...draft, status: 'issued' }, { amount: '50.00' })).toThrow();
    expect(() => assertCanUpdate(admin, draft, { status: 'issued' })).not.toThrow();

    expect(toInvoiceCreationData(data, regular)).toMatchObject({
      ...data, userId: 1, status: 'draft', issuedAt: null,
    });
    expect(toInvoiceCreationData({ ...data, userId: 1, status: 'issued' }, admin))
      .toMatchObject({ userId: 1, status: 'issued', issuedAt: expect.any(Date) });
    expect(toInvoiceUpdateData({ status: 'paid' }, draft))
      .toMatchObject({ status: 'paid', issuedAt: expect.any(Date) });
    const issuedAt = new Date('2025-01-01');
    expect(toInvoiceUpdateData({ status: 'paid' }, { ...draft, issuedAt }))
      .toEqual({ status: 'paid' });
  });

  test('OpenAPI y validadores concuerdan para límites y normalización', async () => {
    const schemas = openApiDocument.components.schemas;
    const ajv = new Ajv({ strict: false });
    const validateCreate = ajv.compile(schemas.CreateInvoiceRequest);
    const app = express();
    app.use(express.json());
    app.post('/invoices', createInvoiceValidation, handleValidation, (req, res) => res.json(req.validatedBody));
    app.patch('/invoices/:id', updateInvoiceValidation, handleValidation, (req, res) => res.json(req.validatedBody));
    app.get('/invoices', listInvoicesValidation, handleValidation, (req, res) => res.json(req.query));
    const server = app.listen(0);
    try {
      const base = `http://127.0.0.1:${server.address().port}`;
      const send = async (path, method, body) => {
        const response = await fetch(base + path, {
          method, headers: { 'Content-Type': 'application/json' },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        return { status: response.status, data: await response.json() };
      };
      const valid = { number: 'INV-1', customerName: 'Empresa', amount: '1.00' };
      expect(validateCreate(valid)).toBe(true);
      expect((await send('/invoices', 'POST', { ...valid, customerName: ' Empresa ' })).data.customerName).toBe('Empresa');
      for (const body of [
        { ...valid, amount: '0.00' }, { ...valid, amount: '1.001' },
        { ...valid, number: ' ' }, { ...valid, number: 'a'.repeat(256) },
        { ...valid, userId: 0 }, { ...valid, userId: '1' }, { ...valid, extra: true },
      ]) {
        expect(validateCreate(body)).toBe(false);
        expect((await send('/invoices', 'POST', body)).status).toBe(400);
      }
      expect((await send('/invoices/1', 'PATCH', { amount: '2.50' })).status).toBe(200);
      expect((await send('/invoices/1', 'PATCH', {})).status).toBe(400);
      expect((await send('/invoices?page=1&limit=100', 'GET')).status).toBe(200);
      expect((await send('/invoices?limit=101', 'GET')).status).toBe(400);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('unicidad de número se reconoce sin confundir otras restricciones', () => {
    const response = () => ({
      statusCode: null, body: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    });
    for (const options of [
      { parent: { constraint: 'invoices_number_key' } },
      { fields: { number: 'INV-1' } },
      { errors: [{ path: 'number' }] },
    ]) {
      const res = response();
      expect(handleInvoiceNumberConflict(new UniqueConstraintError(options), res)).toBe(true);
      expect(res.statusCode).toBe(409);
      expect(res.body).toEqual({ error: 'El número de factura ya existe.' });
    }
    expect(handleInvoiceNumberConflict(new UniqueConstraintError({ fields: { email: 'x' } }), response())).toBe(false);
  });
});
