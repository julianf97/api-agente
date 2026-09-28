import { Router } from 'express';
import { createUser } from './users.controller.js';
import { createUserValidation } from './validators/createUser.validator.js';
import { handleValidation } from './validators/index.js';

const router = Router();

router.post(
  '/',
  createUserValidation,
  handleValidation,
  createUser,
);

export default router;