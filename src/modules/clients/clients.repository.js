import { Client } from '../../models/index.js';

export function findClients({ where = {}, limit, offset }) {
  return Client.findAndCountAll({
    where,
    order: [['id', 'ASC']],
    limit,
    offset,
  });
}

export function findClientById(id, transaction) {
  return Client.findByPk(
    id,
    transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {},
  );
}

export function createClient(data) {
  return Client.create(data);
}

export function updateClient(client, data, transaction) {
  return client.update(data, { transaction });
}

export function deleteClient(client, transaction) {
  return client.destroy({ transaction });
}
