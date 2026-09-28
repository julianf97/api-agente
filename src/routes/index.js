import { Router } from 'express';
import authRouter from '../modules/auth/auth.routes.js';
import usersRouter from '../modules/users/users.routes.js';
import { authenticate } from '../middleweres/authenticate.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/users', authenticate, usersRouter);

export default router;