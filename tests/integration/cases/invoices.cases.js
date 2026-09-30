import { describe, expect, test } from '@jest/globals';

export function registerInvoiceCases(context) {
  const { request, actor } = context;
  const clientData = (
    taxCondition = 'responsable_inscripto',
    country = 'AR',
  ) => ({
    name: 'Empresa Demo',
    taxId: '30-12345678-9',
    address: 'Mitre 123',
    country,
    taxCondition,
  });
  const send = (path, token, body, method = 'POST') =>
    request(path, { method, token, body });

  async function setup(taxCondition, country) {
    const admin = await actor('billing_admin');
    const regular = await actor('billing_regular', 'regular');
    const response = await send(
      '/clients',
      admin.token,
      clientData(taxCondition, country),
    );
    expect(response.status).toBe(201);
    return { admin, regular, client: response.data };
  }
  async function order(client, regular, extra = {}) {
    const response = await send('/documents', regular.token, {
      number: 'OV-1',
      clientId: client.id,
      amount: '123.45',
      ...extra,
    });
    expect(response.status).toBe(201);
    return response.data;
  }

  describe('Clientes y documentos', () => {
    test('CRUD de clientes valida condición fiscal, duplicados y referencias', async () => {
      const { admin, regular, client } = await setup();
      expect((await request('/clients', { token: admin.token })).status).toBe(
        200,
      );
      expect(
        (await request(`/clients/${client.id}`, { token: admin.token })).status,
      ).toBe(200);
      expect(
        (
          await send(
            `/clients/${client.id}`,
            admin.token,
            { name: 'Nuevo nombre' },
            'PATCH',
          )
        ).status,
      ).toBe(200);
      expect((await send('/clients', admin.token, clientData())).status).toBe(
        409,
      );
      expect(
        (
          await send('/clients', admin.token, {
            ...clientData(),
            taxId: 'other',
            taxCondition: null,
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await send('/clients', admin.token, {
            ...clientData(),
            taxId: 'other',
            country: 'ARG',
          })
        ).status,
      ).toBe(400);
      expect(
        (await send(`/clients/${client.id}`, admin.token, {}, 'PATCH')).status,
      ).toBe(400);
      expect(
        (
          await send(
            `/clients/${client.id}`,
            admin.token,
            { extra: true },
            'PATCH',
          )
        ).status,
      ).toBe(400);
      expect(
        (
          await send(
            `/clients/${client.id}`,
            admin.token,
            { name: 'Nombre', extra: true },
            'PATCH',
          )
        ).status,
      ).toBe(400);
      expect(
        (
          await send(
            `/clients/${client.id}`,
            admin.token,
            { country: 'UY', taxCondition: null },
            'PATCH',
          )
        ).data.taxCondition,
      ).toBe(null);
      expect(
        (await request('/clients/999999', { token: admin.token })).status,
      ).toBe(404);
      const document = await order(client, regular);
      expect(
        (
          await request(`/clients/${client.id}`, {
            method: 'DELETE',
            token: admin.token,
          })
        ).status,
      ).toBe(409);
      expect(
        (
          await request(`/documents/${document.id}`, {
            method: 'DELETE',
            token: regular.token,
          })
        ).status,
      ).toBe(204);
      expect(
        (
          await request(`/clients/${client.id}`, {
            method: 'DELETE',
            token: admin.token,
          })
        ).status,
      ).toBe(204);
    });
    test('órdenes propias, cambios, cancelación y bloqueos', async () => {
      const { admin, regular, client } = await setup();
      const other = await actor('other', 'regular');
      const document = await order(client, regular);
      expect(
        (await request('/documents', { token: regular.token })).data.documents,
      ).toHaveLength(1);
      expect(
        (await request('/documents', { token: other.token })).data.documents,
      ).toHaveLength(0);
      expect(
        (await request(`/documents/${document.id}`, { token: other.token }))
          .status,
      ).toBe(404);
      expect(
        (await request(`/documents/${document.id}`, { token: admin.token }))
          .status,
      ).toBe(200);
      expect(
        (
          await send(
            `/documents/${document.id}`,
            regular.token,
            { amount: '200.00' },
            'PATCH',
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await send(
            `/documents/${document.id}`,
            regular.token,
            { amount: '200.00', extra: true },
            'PATCH',
          )
        ).status,
      ).toBe(400);
      expect(
        (await send(`/documents/${document.id}`, regular.token, {}, 'PATCH'))
          .status,
      ).toBe(400);
      expect(
        (
          await send(
            `/documents/${document.id}`,
            regular.token,
            { userId: other.user.id },
            'PATCH',
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await send(
            `/documents/${document.id}`,
            regular.token,
            { status: 'cancelled' },
            'PATCH',
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await send(
            `/documents/${document.id}`,
            regular.token,
            { amount: '1.00' },
            'PATCH',
          )
        ).status,
      ).toBe(409);
      expect(
        (
          await request(`/documents/${document.id}`, {
            method: 'DELETE',
            token: regular.token,
          })
        ).status,
      ).toBe(409);
      expect(
        (
          await request(`/users/${regular.user.id}`, {
            method: 'DELETE',
            token: admin.token,
          })
        ).status,
      ).toBe(409);
    });
    test('validaciones y referencias de órdenes', async () => {
      const { regular, client } = await setup();
      const valid = { number: 'OV-1', clientId: client.id, amount: '123.45' };
      for (const body of [
        {},
        { ...valid, amount: '0' },
        { ...valid, amount: '1.001' },
        { ...valid, clientId: '1' },
        { ...valid, status: 'invoiced' },
        { ...valid, extra: true },
        { ...valid, isExport: 'true' },
      ]) {
        expect((await send('/documents', regular.token, body)).status).toBe(
          400,
        );
      }
      expect(
        (
          await send('/documents', regular.token, {
            ...valid,
            clientId: 999999,
          })
        ).status,
      ).toBe(404);
      await order(client, regular);
      expect((await send('/documents', regular.token, valid)).status).toBe(409);
    });
  });

  describe('Facturación de órdenes', () => {
    test.each([
      ['responsable_inscripto', 'A'],
      ['monotributista', 'A'],
      ['consumidor_final', 'B'],
      ['exento', 'B'],
    ])('emite %s como %s y conserva el snapshot', async (condition, letter) => {
      const { admin, regular, client } = await setup(condition);
      const document = await order(client, regular);
      const result = await send('/invoices', regular.token, {
        number: `${letter}-1`,
        documentId: document.id,
      });
      expect(result.status).toBe(201);
      expect(result.data).toMatchObject({
        type: letter,
        amount: '123.45',
        documentId: document.id,
        userId: regular.user.id,
        clientId: client.id,
        customerName: 'Empresa Demo',
        status: 'issued',
      });
      expect(
        (await request(`/documents/${document.id}`, { token: regular.token }))
          .data.status,
      ).toBe('invoiced');
      await send(
        `/clients/${client.id}`,
        admin.token,
        { name: 'Cliente editado' },
        'PATCH',
      );
      expect(
        (await request(`/invoices/${result.data.id}`, { token: regular.token }))
          .data.customerName,
      ).toBe('Empresa Demo');
      expect(
        (
          await send('/invoices', regular.token, {
            number: `${letter}-2`,
            documentId: document.id,
          })
        ).status,
      ).toBe(409);
      expect(
        (
          await send(
            `/documents/${document.id}`,
            regular.token,
            { amount: '1.00' },
            'PATCH',
          )
        ).status,
      ).toBe(409);
    });
    test('exportación E y cliente extranjero sin condición fiscal', async () => {
      const { regular, client } = await setup(null, 'UY');
      const document = await order(client, regular, { isExport: true });
      expect(
        (
          await send('/invoices', regular.token, {
            number: 'E-1',
            documentId: document.id,
          })
        ).data.type,
      ).toBe('E');
    });
    test('acceso por dueño, estado fiscal inmutable y cancelación admin', async () => {
      const { admin, regular, client } = await setup();
      const other = await actor('other', 'regular');
      const document = await order(client, regular);
      expect(
        (
          await send('/invoices', other.token, {
            number: 'A-1',
            documentId: document.id,
          })
        ).status,
      ).toBe(404);
      const invoice = await send('/invoices', regular.token, {
        number: 'A-1',
        documentId: document.id,
      });
      const id = invoice.data.id;
      expect(
        (await request('/invoices', { token: regular.token })).data.invoices,
      ).toHaveLength(1);
      expect(
        (await request('/invoices', { token: other.token })).data.invoices,
      ).toHaveLength(0);
      expect(
        (await request(`/invoices/${id}`, { token: other.token })).status,
      ).toBe(404);
      expect(
        (
          await send(
            `/invoices/${id}`,
            regular.token,
            { status: 'paid' },
            'PATCH',
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await send(
            `/invoices/${id}`,
            admin.token,
            { amount: '1.00' },
            'PATCH',
          )
        ).status,
      ).toBe(400);
      expect(
        (
          await send(
            `/invoices/${id}`,
            admin.token,
            { status: 'paid' },
            'PATCH',
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await send(
            `/invoices/${id}`,
            admin.token,
            { status: 'cancelled' },
            'PATCH',
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await send(
            `/invoices/${id}`,
            admin.token,
            { status: 'paid' },
            'PATCH',
          )
        ).status,
      ).toBe(409);
      expect(
        (
          await request(`/invoices/${id}`, {
            method: 'DELETE',
            token: admin.token,
          })
        ).status,
      ).toBe(409);
    });
    test('concurrencia y rollback impiden facturas duplicadas y órdenes parcialmente facturadas', async () => {
      const { regular, client } = await setup();
      const document = await order(client, regular);
      const results = await Promise.all(
        ['A-1', 'A-2'].map((number) =>
          send('/invoices', regular.token, { number, documentId: document.id }),
        ),
      );
      expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
      expect(await context.Invoice.count()).toBe(1);
      const second = await order(client, regular, { number: 'OV-2' });
      const existingNumber = results.find((result) => result.status === 201)
        .data.number;
      expect(
        (
          await send('/invoices', regular.token, {
            number: existingNumber,
            documentId: second.id,
          })
        ).status,
      ).toBe(409);
      expect((await context.Document.findByPk(second.id)).status).toBe(
        'pending',
      );
    });
    test('ventas locales a extranjeros y órdenes canceladas no generan factura', async () => {
      const { regular, client } = await setup(null, 'UY');
      const document = await order(client, regular);
      expect(
        (
          await send('/invoices', regular.token, {
            number: 'A-1',
            documentId: document.id,
          })
        ).status,
      ).toBe(409);
      expect(await context.Invoice.count()).toBe(0);
      await send(
        `/documents/${document.id}`,
        regular.token,
        { status: 'cancelled' },
        'PATCH',
      );
      expect(
        (
          await send('/invoices', regular.token, {
            number: 'E-1',
            documentId: document.id,
          })
        ).status,
      ).toBe(409);
    });
  });
}
