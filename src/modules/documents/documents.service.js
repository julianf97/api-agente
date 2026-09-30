import { findExistingDocumentById } from './support/find-existing-document.js';
import { assertDocumentReferences } from './support/assert-document-references.js';
import { toDocumentCreationData } from './support/documents.mapper.js';
import {
  findDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  inDocumentTransaction,
} from './documents.repository.js';
import { assertPendingDocument } from './support/documents.guards.js';

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
  return findExistingDocumentById(id);
}

export async function addDocument(data, actor) {
  const documentData = toDocumentCreationData(data, actor);
  await assertDocumentReferences(documentData);
  return createDocument(documentData);
}

export async function editDocument(id, data) {
  await assertDocumentReferences(data);
  return inDocumentTransaction(async (transaction) => {
    const document = await findExistingDocumentById(id, transaction);
    assertPendingDocument(document);
    return updateDocument(document, data, transaction);
  });
}

export async function removeDocument(id) {
  return inDocumentTransaction(async (transaction) => {
    const document = await findExistingDocumentById(id, transaction);
    assertPendingDocument(document);
    await deleteDocument(document, transaction);
  });
}
