import { Router } from 'express';
import authRouter from '../modules/auth/auth.routes.js';
import usersRouter from '../modules/users/users.routes.js';
import { authenticate } from '../middleweres/authenticate.js';
import { requireAdmin } from '../middleweres/require-admin.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/users', authenticate, requireAdmin, usersRouter);

export default router;