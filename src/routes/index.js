import { authContext } from '../modules/auth/support/auth.context.js';
import { responseContext } from '../middleweres/response-context.js';
import { invoiceContext } from '../modules/invoices/support/invoices.context.js';
import { documentContext } from '../modules/documents/support/documents.context.js';
import { clientContext } from '../modules/clients/support/clients.context.js';
import clientsRouter from '../modules/clients/clients.routes.js';
import documentsRouter from '../modules/documents/documents.routes.js';
import { requireAdmin } from '../middleweres/require-admin.js';
import { Router } from 'express';
import authRouter from '../modules/auth/auth.routes.js';
import usersRouter from '../modules/users/users.routes.js';
import invoicesRouter from '../modules/invoices/invoices.routes.js';
import { authenticate } from '../middleweres/authenticate.js';

const router = Router();

router.use('/auth', responseContext(authContext), authRouter);
router.use('/users', authenticate, requireAdmin, usersRouter);
router.use('/clients', responseContext(clientContext), authenticate, clientsRouter);
router.use('/documents', responseContext(documentContext), authenticate, documentsRouter);
router.use('/invoices', responseContext(invoiceContext), authenticate, invoicesRouter);

export default router;
