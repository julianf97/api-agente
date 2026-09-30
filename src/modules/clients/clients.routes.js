import { Router } from 'express';
import { handleValidation } from '../../middleweres/handle-validation.js';
import {
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
} from './clients.controller.js';
import {
  clientIdValidation,
  listClientsValidation,
  createClientValidation,
  updateClientValidation,
} from './validators/clients.validator.js';

const router = Router();
router.get('/', listClientsValidation, handleValidation, listClients);
router.get('/:id', clientIdValidation, handleValidation, getClient);
router.post('/', createClientValidation, handleValidation, createClient);
router.patch('/:id', updateClientValidation, handleValidation, updateClient);
router.delete('/:id', clientIdValidation, handleValidation, deleteClient);
export default router;
