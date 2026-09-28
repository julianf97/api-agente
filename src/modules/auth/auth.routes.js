import { Router } from 'express';
import { login } from './auth.controller.js';
import { loginValidation } from './validators/login.validator.js';
import { handleValidation } from '../../middleweres/handle-validation.js';

const router = Router();

router.post(
  '/login',
  loginValidation,
  handleValidation,
  login,
);

export default router;