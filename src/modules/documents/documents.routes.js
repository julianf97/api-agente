import { Router } from 'express';
import { handleValidation } from '../../middleweres/handle-validation.js';
import {
  listDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
} from './documents.controller.js';
import {
  documentIdValidation,
  listDocumentsValidation,
  createDocumentValidation,
  updateDocumentValidation,
} from './validators/documents.validator.js';

const router = Router();
router.get('/', listDocumentsValidation, handleValidation, listDocuments);
router.get('/:id', documentIdValidation, handleValidation, getDocument);
router.post('/', createDocumentValidation, handleValidation, createDocument);
router.patch(
  '/:id',
  updateDocumentValidation,
  handleValidation,
  updateDocument,
);
router.delete('/:id', documentIdValidation, handleValidation, deleteDocument);
export default router;
