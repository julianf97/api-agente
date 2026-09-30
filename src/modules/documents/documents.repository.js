import { Document } from '../../models/index.js';
import { sequelize } from '../../db/index.js';

export function findDocuments({ where = {}, limit, offset }) {
  return Document.findAndCountAll({
    where,
    order: [['id', 'ASC']],
    limit,
    offset,
  });
}

export function findDocumentById(id, transaction) {
  return Document.findByPk(
    id,
    transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {},
  );
}

export function createDocument(data) {
  return Document.create(data);
}

export function updateDocument(document, data, transaction) {
  return document.update(data, { transaction });
}

export function deleteDocument(document, transaction) {
  return document.destroy({ transaction });
}

export function inDocumentTransaction(action) {
  return sequelize.transaction(action);
}
