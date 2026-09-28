import express from 'express';
import router from './routes/index.js';
import { errorHandler } from './middleweres/error-handler.js';
import registerSwagger from './swagger/index.js';

const app = express();

app.use(express.json());

app.use(router);

registerSwagger(app);

app.use(errorHandler);

export default app;