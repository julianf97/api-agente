import app from './app.js';
import { SERVER_MESSAGES } from './constants/constants.js';
import { initializeDatabase } from './db/index.js';

const port = process.env.PORT || 3000;

async function startServer() {
  try {
    await initializeDatabase();

    app.listen(port, () => {
      console.log(SERVER_MESSAGES.API_LISTENING(port));
    });
  } catch {
    console.error(SERVER_MESSAGES.DATABASE_INITIALIZATION_FAILED);
    process.exit(1);
  }
}

startServer();