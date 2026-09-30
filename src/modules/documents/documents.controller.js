import { matchedData } from 'express-validator';
import { toDocumentResponse } from './support/documents.presenter.js';
import {
  listDocuments as listService,
  getDocument as getService,
  addDocument as addService,
  editDocument as editService,
  removeDocument as removeService,
} from './documents.service.js';

export async function listDocuments(req, res, next) {
  try {
    const result = await listService(matchedData(req, { locations: ['query'] }));
    return res.json({
      documents: result.documents.map(toDocumentResponse),
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getDocument(req, res, next) {
  try {
    return res.json(
      toDocumentResponse(await getService(req.params.id)),
    );
  } catch (error) {
    return next(error);
  }
}

export async function createDocument(req, res, next) {
  try {
    return res
      .status(201)
      .json(toDocumentResponse(await addService(req.validatedBody, req.auth)));
  } catch (error) {
    return next(error);
  }
}

export async function updateDocument(req, res, next) {
  try {
    return res.json(
      toDocumentResponse(
        await editService(req.params.id, req.validatedBody),
      ),
    );
  } catch (error) {
    return next(error);
  }
}

export async function deleteDocument(req, res, next) {
  try {
    await removeService(req.params.id);
    return res.status(200).json({ message: 'Registro eliminado.' });
  } catch (error) {
    return next(error);
  }
}
