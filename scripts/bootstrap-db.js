import 'dotenv/config';
import { Client } from 'pg';

const schema = process.env.DB_SCHEMA;
if (!schema || !process.env.DB_TEST_SCHEMA || schema === process.env.DB_TEST_SCHEMA) {
  throw new Error('Configure distinct DB_SCHEMA and DB_TEST_SCHEMA values.');
}

const client = new Client({
  host: process.env.DB_HOST,
  port: Number.parseInt(process.env.DB_PORT, 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

try {
  await client.connect();
  for (const name of [schema, process.env.DB_TEST_SCHEMA]) {
    const identifier = `"${name.replaceAll('"', '""')}"`;
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${identifier}`);
  }
} finally {
  await client.end();
}

// sync() creates missing tables only. Existing tables are not altered or dropped.
const { sequelize } = await import('../src/db/index.js');
await import('../src/models/index.js');
try {
  await sequelize.sync();
} finally {
  await sequelize.close();
}
