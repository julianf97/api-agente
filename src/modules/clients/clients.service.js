import { BillingError } from '../../errors/billing-error.js';
import { assertClientTaxData } from './support/clients.guards.js';
import {
  findClients,
  findClientById,
  createClient,
  updateClient,
  deleteClient,
} from './clients.repository.js';

export async function listClients({ page = 1, limit = 20 }) {
  const { rows, count } = await findClients({
    limit,
    offset: (page - 1) * limit,
  });
  return {
    clients: rows,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  };
}

export async function getClient(id) {
  const client = await findClientById(id);
  if (!client) throw new BillingError('Cliente no encontrado.', 404);
  return client;
}

export async function addClient(data) {
  const clientData = { country: 'AR', taxCondition: null, ...data };
  assertClientTaxData(clientData);
  return createClient(clientData);
}

export async function editClient(id, data) {
  const client = await getClient(id);
  assertClientTaxData({ ...client.get({ plain: true }), ...data });
  return updateClient(client, data);
}

export async function removeClient(id) {
  await deleteClient(await getClient(id));
}
