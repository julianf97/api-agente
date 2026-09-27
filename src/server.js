import app from './app.js';
import { initializeDatabase } from './db/index.js';

const port = process.env.PORT || 3000;

async function startServer() {
  try {
    await initializeDatabase();

    app.listen(port, () => {
      console.log(`API listening on port ${port}`);
    });
  } catch {
    console.error('Database initialization failed.');
    process.exit(1);
  }
}

startServer();
