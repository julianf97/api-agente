export async function up({ context: queryInterface }) {
  const { sequelize } = queryInterface;
  const schema = queryInterface.queryGenerator.quoteIdentifier(
    process.env.DB_SCHEMA,
  );
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      `DROP TABLE IF EXISTS ${schema}.billing_legacy_roles`,
      { transaction },
    );
    // The renamed legacy table originally cascaded user deletions.
    await sequelize.query(
      `ALTER TABLE ${schema}.documents
      DROP CONSTRAINT IF EXISTS "invoices_userId_fkey",
      ADD CONSTRAINT documents_userId_fkey FOREIGN KEY ("userId")
        REFERENCES ${schema}.users(id) ON UPDATE CASCADE ON DELETE RESTRICT`,
      { transaction },
    );
  });
}

export async function down({ context: queryInterface }) {
  const { sequelize } = queryInterface;
  const schema = queryInterface.queryGenerator.quoteIdentifier(
    process.env.DB_SCHEMA,
  );
  await sequelize.transaction(async (transaction) => {
    // This demo intentionally discarded historical superadmin roles.
    await sequelize.query(
      `CREATE TABLE IF NOT EXISTS ${schema}.billing_legacy_roles (id INTEGER, role VARCHAR(255))`,
      { transaction },
    );
    await sequelize.query(
      `ALTER TABLE ${schema}.documents
      DROP CONSTRAINT IF EXISTS documents_userId_fkey,
      ADD CONSTRAINT "invoices_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES ${schema}.users(id) ON UPDATE CASCADE ON DELETE CASCADE`,
      { transaction },
    );
  });
}
