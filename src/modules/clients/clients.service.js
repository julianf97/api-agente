import { findExistingClientById } from './support/find-existing-client.js';
import { toClientCreationData, toClientTaxValidationData } from './support/clients.mapper.js';
import { assertClientTaxData } from './support/clients.guards.js';
import {
  findClients,
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
  return findExistingClientById(id);
}

export async function addClient(data) {
  const clientData = toClientCreationData(data);
  assertClientTaxData(clientData);
  return createClient(clientData);
}

export async function editClient(id, data) {
  const client = await getClient(id);
  assertClientTaxData(toClientTaxValidationData(client, data));
  return updateClient(client, data);
}

export async function removeClient(id) {
  await deleteClient(await getClient(id));
}
