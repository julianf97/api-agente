import 'dotenv/config';
import { Sequelize, QueryTypes } from 'sequelize';

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
    // Registra los modelos y exige que las migraciones de tests ya estén aplicadas.
    await import('../models/index.js');
    const quoted = sequelize
      .getQueryInterface()
      .quoteIdentifier(process.env.DB_TEST_SCHEMA);
    const tables = await sequelize.query(
      'SELECT table_name AS name FROM information_schema.tables WHERE table_schema = :schema',
      {
        replacements: { schema: process.env.DB_TEST_SCHEMA },
        type: QueryTypes.SELECT,
      },
    );
    if (
      !['users', 'clients', 'documents', 'invoices'].every((name) =>
        tables.some((table) => table.name === name),
      )
    ) {
      throw new Error(
        `Faltan tablas en ${quoted}; ejecutá npm run db:migrate:test:reset.`,
      );
    }
  }
}

export { initializeDatabase, sequelize };
