import { sequelize } from '../index.js';
import { User, Client, Document } from '../../models/index.js';

export function inDemoTransaction(action) {
  return sequelize.transaction(action);
}

export function lockDemoSeed(transaction) {
  return sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:key))', {
    replacements: { key: `api-agente:demo:${process.env.DB_SCHEMA}` },
    transaction,
  });
}

export function findDemoUser(email, transaction) {
  return User.findOne({ where: { email }, transaction });
}

export function createDemoUser(data, transaction) {
  return User.create(data, { transaction });
}

export async function findOrCreateDemoClient(data, transaction) {
  const [client] = await Client.findOrCreate({
    where: { country: data.country, taxId: data.taxId },
    defaults: data,
    transaction,
  });
  return client;
}

export async function findOrCreateDemoDocument(data, transaction) {
  const [, created] = await Document.findOrCreate({
    where: { number: data.number },
    defaults: data,
    transaction,
  });
  return created;
}
