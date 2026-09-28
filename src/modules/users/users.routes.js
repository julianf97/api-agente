import { Router } from 'express';
import {
  createUser,
  updateUser,
  deleteUser,
} from './users.controller.js';
import { createUserValidation } from './validators/createUser.validator.js';
import { updateUserValidation } from './validators/updateUser.validator.js';
import { deleteUserValidation } from './validators/deleteUser.validator.js';
import { handleValidation } from '../../middleweres/handle-validation.js';

const router = Router();

router.post(
  '/',
  createUserValidation,
  handleValidation,
  createUser,
);

router.patch(
  '/:id',
  updateUserValidation,
  handleValidation,
  updateUser,
);

router.delete(
  '/:id',
  deleteUserValidation,
  handleValidation,
  deleteUser,
);

export default router;