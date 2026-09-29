import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { Umzug, SequelizeStorage } from 'umzug';
import { sequelize } from '../src/db/index.js';

const command = process.argv[2] ?? 'up';
const schema = process.env.DB_SCHEMA;
if (!schema || process.env.DB_USE_TEST_SCHEMA === 'true' || schema === process.env.DB_TEST_SCHEMA) {
  throw new Error('Configurá DB_SCHEMA separado de DB_TEST_SCHEMA y desactivá DB_USE_TEST_SCHEMA.');
}
const queryInterface = sequelize.getQueryInterface();
const quotedSchema = queryInterface.queryGenerator.quoteIdentifier(schema);
const migrator = new Umzug({
  migrations: { glob: fileURLToPath(new URL('../migrations/*.js', import.meta.url)) },
  context: queryInterface,
  storage: new SequelizeStorage({ sequelize, tableName: 'SequelizeMeta', schema }),
  logger: console,
});
try {
  await sequelize.authenticate();
  // Prevent two migration processes from applying the same transition concurrently.
  await sequelize.transaction(async (transaction) => {
    await sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:key))', {
      replacements: { key: `api-agente:migrations:${schema}` }, transaction,
    });
    const [schemas] = await sequelize.query('SELECT 1 FROM pg_namespace WHERE nspname = :schema', { replacements: { schema }, transaction });
    if (!schemas.length) throw new Error(`El schema ${quotedSchema} no existe; inicializá primero la base original.`);
    if (command === 'up') await migrator.up();
    else if (command === 'down') await migrator.down();
    else if (command === 'status') console.log({ executed: await migrator.executed(), pending: await migrator.pending() });
    else throw new Error('Comando inválido: usá up, down o status.');
  });
} finally {
  await sequelize.close();
}
