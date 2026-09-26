import express from 'express';
import registerSwagger from './swagger/index.js';

const app = express();

app.get('/', (_request, response) => {
  response.json({ message: 'API is running' });
});

registerSwagger(app);

export default app;
