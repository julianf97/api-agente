import express from 'express';
import router from './routes/index.js';
import { errorHandler } from './middleweres/error-handler.js';
import registerSwagger from './swagger/index.js';

const app = express();

app.use(router);

registerSwagger(app);

app.use(errorHandler);

export default app;
