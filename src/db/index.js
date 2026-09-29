import 'dotenv/config';
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number.parseInt(process.env.DB_PORT, 10),
    dialect: 'postgres',
  },
);

async function initializeDatabase() {
  await sequelize.authenticate();

  if (process.env.DB_USE_TEST_SCHEMA === 'true') {
    // Registra todos los modelos antes de crear las tablas del schema de pruebas.
    await import('../models/index.js');
    await sequelize.sync();
  }
}

export { initializeDatabase, sequelize };