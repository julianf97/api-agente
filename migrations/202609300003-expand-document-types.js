export async function up({ context: queryInterface }) {
  const schema = queryInterface.queryGenerator.quoteIdentifier(process.env.DB_SCHEMA);
  // New enum values are committed before the application starts using them.
  await queryInterface.sequelize.transaction(async (transaction) => {
    for (const type of ['OC', 'PR', 'RE', 'NC']) {
      await queryInterface.sequelize.query(
        `ALTER TYPE ${schema}.enum_documents_type ADD VALUE IF NOT EXISTS '${type}'`,
        { transaction },
      );
    }
  });
}

export async function down({ context: queryInterface }) {
  const { sequelize } = queryInterface;
  const schema = queryInterface.queryGenerator.quoteIdentifier(process.env.DB_SCHEMA);
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(`LOCK TABLE ${schema}.documents IN ACCESS EXCLUSIVE MODE`, { transaction });
    const [rows] = await sequelize.query(
      `SELECT 1 FROM ${schema}.documents WHERE type::text <> 'OV' LIMIT 1`,
      { transaction },
    );
    if (rows.length) {
      throw new Error('No se puede revertir: existen documentos OC, PR, RE o NC.');
    }
    // PostgreSQL cannot remove enum values; recreate the original type safely.
    await sequelize.query(`
      CREATE TYPE ${schema}.enum_documents_type_ov AS ENUM ('OV');
      ALTER TABLE ${schema}.documents ALTER COLUMN type DROP DEFAULT;
      ALTER TABLE ${schema}.documents ALTER COLUMN type
        TYPE ${schema}.enum_documents_type_ov USING type::text::${schema}.enum_documents_type_ov;
      DROP TYPE ${schema}.enum_documents_type;
      ALTER TYPE ${schema}.enum_documents_type_ov RENAME TO enum_documents_type;
      ALTER TABLE ${schema}.documents ALTER COLUMN type SET DEFAULT 'OV';
    `, { transaction });
  });
}
