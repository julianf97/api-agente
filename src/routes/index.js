import { Router } from 'express';
import authRouter from '../modules/auth/auth.routes.js';
import usersRouter from '../modules/users/users.routes.js';
import invoicesRouter from '../modules/invoices/invoices.routes.js';
import { authenticate } from '../middleweres/authenticate.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/users', authenticate, usersRouter);
router.use('/invoices', authenticate, invoicesRouter);

export default router;