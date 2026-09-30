import { findDocumentById } from '../documents.repository.js';
import { assertDocumentExists } from './documents.guards.js';

export async function findExistingDocumentById(id, transaction) {
  const document = await findDocumentById(id, transaction);
  assertDocumentExists(document);
  return document;
}
