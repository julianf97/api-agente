import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { Umzug, SequelizeStorage } from 'umzug';


const command = process.argv[2] ?? 'up';
const testMode = process.argv.includes('--test');
const reset = process.argv.includes('--reset');
const mainSchema = process.env.DB_SCHEMA;
const testSchema = process.env.DB_TEST_SCHEMA ?? 'api-agente-test';
if (testMode) {
  if (testSchema === mainSchema || !testSchema.endsWith('-test')) {
    throw new Error('DB_TEST_SCHEMA debe ser distinto de DB_SCHEMA y terminar en -test.');
  }
  process.env.DB_SCHEMA = testSchema;
  process.env.DB_TEST_SCHEMA = testSchema;
  process.env.DB_USE_TEST_SCHEMA = 'true';
  delete process.env.MIGRATION_CLIENTS_FILE;
} else if (!mainSchema || process.env.DB_USE_TEST_SCHEMA === 'true' || mainSchema === testSchema) {
  throw new Error('Usá --test para migrar tests; DB_SCHEMA debe estar separado de DB_TEST_SCHEMA.');
}
if (reset && (!testMode || command !== 'up')) {
  throw new Error('--reset solo se permite con up --test; elimina únicamente el schema de tests.');
}
const schema = process.env.DB_SCHEMA;
const { sequelize } = await import('../src/db/index.js');
const queryInterface = sequelize.getQueryInterface();
const quotedSchema = queryInterface.queryGenerator.quoteIdentifier(schema);
const migrator = new Umzug({
  // Keep glob syntax separate from the native directory path (Windows uses backslashes).
  migrations: {
    glob: ['*.js', { cwd: fileURLToPath(new URL('../migrations/', import.meta.url)) }],
  },
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
    if (reset) {
      // Recreate the disposable test schema with the same empty legacy baseline as Docker.
      const baseline = await readFile(new URL('../docker/init/01-seed.sql', import.meta.url), 'utf8');
      if (/\\b(?:COPY|INSERT\\s+INTO)\\b/i.test(baseline)) {
        throw new Error('La estructura inicial de tests no debe contener datos de ejemplo.');
      }
      const baselineSql = baseline
        .replace(/^SET [^\r\n]*;\r?$/gm, '')
        .replace(/SELECT pg_catalog\\.set_config[^;]*;/g, '')
        .replaceAll('"api-agente"', quotedSchema);
      await sequelize.transaction(async (setupTransaction) => {
        await sequelize.query(`DROP SCHEMA IF EXISTS ${quotedSchema} CASCADE`, { transaction: setupTransaction });
        await sequelize.query(baselineSql, { transaction: setupTransaction });
      });
    }
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
