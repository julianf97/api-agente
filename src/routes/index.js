import clientsRouter from '../modules/clients/clients.routes.js';
import documentsRouter from '../modules/documents/documents.routes.js';
import { requireAdmin } from '../middleweres/require-admin.js';
import { Router } from 'express';
import authRouter from '../modules/auth/auth.routes.js';
import usersRouter from '../modules/users/users.routes.js';
import invoicesRouter from '../modules/invoices/invoices.routes.js';
import { authenticate } from '../middleweres/authenticate.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/users', authenticate, requireAdmin, usersRouter);
router.use('/clients', authenticate, requireAdmin, clientsRouter);
router.use('/documents', authenticate, documentsRouter);
router.use('/invoices', authenticate, invoicesRouter);

export default router;
