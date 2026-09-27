import 'dotenv/config';
import { Sequelize } from 'sequelize';

const databaseSchema = process.env.DB_SCHEMA;

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
  const { registerModels } = await import('../models/index.js');

  registerModels(sequelize, databaseSchema);
  await sequelize.authenticate();
  await sequelize.sync({ alter: false });
}

export { initializeDatabase, sequelize };
