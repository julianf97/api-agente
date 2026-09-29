import 'dotenv/config';
import { sequelize } from '../src/db/index.js';

const { DB_SCHEMA: appSchema, DB_TEST_SCHEMA: testSchema } = process.env;

function quotedSchema(name) {
  if (!name || !/^[a-z][a-z0-9_-]*$/i.test(name)) {
    throw new Error('DB_SCHEMA and DB_TEST_SCHEMA must be nonempty PostgreSQL schema names.');
  }
  return '"' + name.replaceAll('"', '""') + '"';
}

if (appSchema === testSchema || [appSchema, testSchema].includes('public')) {
  throw new Error('DB_SCHEMA and DB_TEST_SCHEMA must differ and must not be public.');
}

try {
  await sequelize.authenticate();
  await sequelize.query(`CREATE SCHEMA IF NOT EXISTS ${quotedSchema(appSchema)}`);
  await sequelize.query(`CREATE SCHEMA IF NOT EXISTS ${quotedSchema(testSchema)}`);
  await import('../src/models/index.js');
  await sequelize.sync();
  console.log('Development database schemas and application tables are ready.');
} finally {
  await sequelize.close();
}
