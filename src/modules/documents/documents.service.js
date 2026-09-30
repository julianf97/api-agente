import { BillingError } from '../../errors/billing-error.js';
import { getClient } from '../clients/clients.service.js';
import { findExistingUserById } from '../users/support/find-existing-user.js';
import {
  findDocuments,
  findDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
  inDocumentTransaction,
} from './documents.repository.js';
import {
  assertDocumentExists,
  assertPendingDocument,
} from './support/documents.guards.js';

export async function listDocuments({ page = 1, limit = 20 }) {
  const { rows, count } = await findDocuments({
    limit,
    offset: (page - 1) * limit,
  });
  return {
    documents: rows,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  };
}

export async function getDocument(id) {
  const document = await findDocumentById(id);
  assertDocumentExists(document);
  return document;
}

async function assertReferences(data) {
  if (data.clientId !== undefined) await getClient(data.clientId);
  if (data.userId !== undefined) {
    const user = await findExistingUserById(data.userId);
    if (!user.enabled)
      throw new BillingError('El dueño del documento debe estar habilitado.');
  }
}

export async function addDocument(data, actor) {
  const documentData = {
    ...data,
    userId: data.userId ?? Number(actor.sub),
    status: 'pending',
  };
  await assertReferences(documentData);
  return createDocument(documentData);
}

export async function editDocument(id, data) {
  await assertReferences(data);
  return inDocumentTransaction(async (transaction) => {
    const document = await findDocumentById(id, transaction);
    assertDocumentExists(document);
    assertPendingDocument(document);
    return updateDocument(document, data, transaction);
  });
}

export async function removeDocument(id) {
  return inDocumentTransaction(async (transaction) => {
    const document = await findDocumentById(id, transaction);
    assertDocumentExists(document);
    assertPendingDocument(document);
    await deleteDocument(document, transaction);
  });
}
