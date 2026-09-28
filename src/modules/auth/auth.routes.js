import { Router } from 'express';
import { login } from './auth.controller.js';
import { loginValidation } from './validators/login.validator.js';
import { handleValidation } from '../users/validators/index.js';

const router = Router();

router.post(
  '/login',
  loginValidation,
  handleValidation,
  login,
);

export default router;