import { readFile } from 'node:fs/promises';

export async function up({ context: queryInterface }) {
  const { sequelize } = queryInterface;
  const schema = process.env.DB_SCHEMA;
  const q = queryInterface.queryGenerator.quoteIdentifier(schema);
  const sql = (text, transaction, replacements) => sequelize.query(text, { transaction, replacements });
  const mapping = process.env.MIGRATION_CLIENTS_FILE
    ? JSON.parse(await readFile(process.env.MIGRATION_CLIENTS_FILE, 'utf8'))
    : [];
  if (!Array.isArray(mapping)) throw new Error('MIGRATION_CLIENTS_FILE debe contener un array de clientes.');

  await sequelize.transaction(async (transaction) => {
    await sql(`LOCK TABLE ${q}.users, ${q}.invoices IN ACCESS EXCLUSIVE MODE`, transaction);
    const [customers] = await sql(`SELECT DISTINCT "customerName" FROM ${q}.invoices`, transaction);
    const byName = new Map();
    const byTaxId = new Map();
    for (const client of mapping) {
      if (byName.has(client.legacyCustomerName)) throw new Error('Nombre de cliente duplicado en el archivo de migración.');
      const { Client } = await import('../src/models/index.js');
      await Client.build(client).validate();
      const identity = JSON.stringify([client.country ?? 'AR', client.taxId]);
      const details = JSON.stringify([client.name, client.taxCondition ?? null, client.address]);
      if (byTaxId.has(identity) && byTaxId.get(identity) !== details) {
        throw new Error('Datos contradictorios para la misma identificación fiscal.');
      }
      byTaxId.set(identity, details);
      byName.set(client.legacyCustomerName, client);
    }
    const missing = customers.filter((row) => !byName.has(row.customerName));
    if (missing.length) {
      throw new Error(`Faltan datos fiscales en MIGRATION_CLIENTS_FILE para: ${missing.map((row) => row.customerName).join(', ')}`);
    }
    const [invalidRoles] = await sql(`SELECT id FROM ${q}.users WHERE role NOT IN ('regular', 'admin', 'superadmin')`, transaction);
    if (invalidRoles.length) throw new Error('Hay roles desconocidos; corregilos antes de migrar.');

    // Rename legacy types and constraints so the new invoices table can reuse its names.
    await sql(`ALTER TABLE ${q}.invoices RENAME TO documents`, transaction);
    await sql(`ALTER TYPE ${q}.enum_invoices_status RENAME TO enum_documents_legacyStatus`, transaction);
    await sql(`ALTER TABLE ${q}.documents RENAME COLUMN status TO "legacyStatus"`, transaction);
    const [constraints] = await sql(`SELECT conname FROM pg_constraint WHERE conrelid = '${q}.documents'::regclass AND contype IN ('p', 'u')`, transaction);
    for (const { conname } of constraints) {
      const oldName = queryInterface.queryGenerator.quoteIdentifier(conname);
      const newName = queryInterface.queryGenerator.quoteIdentifier(`legacy_documents_${conname}`);
      await sql(`ALTER TABLE ${q}.documents RENAME CONSTRAINT ${oldName} TO ${newName}`, transaction);
    }
    await sql(`ALTER SEQUENCE ${q}.invoices_id_seq RENAME TO documents_id_seq`, transaction);
    await sql(`CREATE TYPE ${q}.enum_clients_taxCondition AS ENUM ('responsable_inscripto','monotributista','consumidor_final','exento')`, transaction);
    await sql(`CREATE TABLE ${q}.clients (
      id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, "taxId" VARCHAR(32) NOT NULL,
      "taxCondition" ${q}.enum_clients_taxCondition,
      country VARCHAR(2) NOT NULL DEFAULT 'AR', address VARCHAR(255) NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL, "updatedAt" TIMESTAMPTZ NOT NULL,
      UNIQUE(country, "taxId"), CHECK(country ~ '^[A-Z]{2}$'),
      CHECK(country <> 'AR' OR "taxCondition" IS NOT NULL)
    )`, transaction);
    await sql(`CREATE TYPE ${q}.enum_documents_type AS ENUM ('OV')`, transaction);
    await sql(`CREATE TYPE ${q}.enum_documents_status AS ENUM ('pending','invoiced','cancelled')`, transaction);
    await sql(`ALTER TABLE ${q}.documents
      ADD COLUMN type ${q}.enum_documents_type NOT NULL DEFAULT 'OV',
      ADD COLUMN "clientId" INTEGER REFERENCES ${q}.clients(id) ON DELETE RESTRICT ON UPDATE CASCADE,
      ADD COLUMN "isExport" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN status ${q}.enum_documents_status NOT NULL DEFAULT 'pending'`, transaction);
    for (const { customerName } of customers) {
      const client = byName.get(customerName);
      const [rows] = await sql(`INSERT INTO ${q}.clients(name,"taxId","taxCondition",country,address,"createdAt","updatedAt")
        VALUES(:name,:taxId,:taxCondition,:country,:address,NOW(),NOW())
        ON CONFLICT(country,"taxId") DO UPDATE SET "taxId" = EXCLUDED."taxId" RETURNING id`, transaction, {
        name: client.name, taxId: client.taxId, taxCondition: client.taxCondition ?? null,
        country: client.country ?? 'AR', address: client.address,
      });
      await sql(`UPDATE ${q}.documents SET "clientId" = :id WHERE "customerName" = :customerName`, transaction, { id: rows[0].id, customerName });
    }
    await sql(`UPDATE ${q}.documents SET status = CASE "legacyStatus"::text
      WHEN 'draft' THEN 'pending' WHEN 'cancelled' THEN 'cancelled' ELSE 'invoiced' END::${q}.enum_documents_status`, transaction);
    // Keep historical fields for an exact rollback; they are not used by the new model.
    await sql(`ALTER TABLE ${q}.documents ALTER COLUMN "clientId" SET NOT NULL,
      ALTER COLUMN "customerName" DROP NOT NULL, ALTER COLUMN "legacyStatus" DROP NOT NULL`, transaction);
    await sql(`CREATE INDEX documents_type_status_user ON ${q}.documents(type,status,"userId")`, transaction);
    await sql(`CREATE INDEX documents_client ON ${q}.documents("clientId")`, transaction);
    await sql(`CREATE TYPE ${q}.enum_invoices_type AS ENUM ('A','B','E')`, transaction);
    await sql(`CREATE TYPE ${q}.enum_invoices_status AS ENUM ('draft','issued','paid','cancelled')`, transaction);
    await sql(`CREATE TABLE ${q}.invoices (
      id SERIAL PRIMARY KEY, number VARCHAR(255) NOT NULL UNIQUE,
      "documentId" INTEGER NOT NULL UNIQUE REFERENCES ${q}.documents(id) ON DELETE RESTRICT ON UPDATE CASCADE,
      "clientId" INTEGER NOT NULL REFERENCES ${q}.clients(id) ON DELETE RESTRICT ON UPDATE CASCADE,
      "userId" INTEGER NOT NULL REFERENCES ${q}.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
      type ${q}.enum_invoices_type NOT NULL,
      "customerName" VARCHAR(255) NOT NULL, "customerTaxId" VARCHAR(32) NOT NULL,
      "customerTaxCondition" VARCHAR(32), "customerCountry" VARCHAR(2) NOT NULL,
      "customerAddress" VARCHAR(255) NOT NULL, amount NUMERIC(12,2) NOT NULL CHECK(amount > 0),
      status ${q}.enum_invoices_status NOT NULL DEFAULT 'issued', "issuedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "createdAt" TIMESTAMPTZ NOT NULL, "updatedAt" TIMESTAMPTZ NOT NULL
    )`, transaction);
    await sql(`CREATE TABLE ${q}.billing_legacy_roles AS SELECT id, role FROM ${q}.users WHERE role = 'superadmin'`, transaction);
    await sql(`UPDATE ${q}.users SET role = 'admin' WHERE role = 'superadmin'`, transaction);
    await sql(`ALTER TABLE ${q}.users ADD CONSTRAINT users_role_check CHECK(role IN ('regular','admin'))`, transaction);
  });
}

export async function down({ context: queryInterface }) {
  const { sequelize } = queryInterface;
  const q = queryInterface.queryGenerator.quoteIdentifier(process.env.DB_SCHEMA);
  const sql = (text, transaction) => sequelize.query(text, { transaction });
  await sequelize.transaction(async (transaction) => {
    await sql(`LOCK TABLE ${q}.users, ${q}.documents, ${q}.invoices, ${q}.clients IN ACCESS EXCLUSIVE MODE`, transaction);
    const [[counts]] = await sql(`SELECT
      (SELECT COUNT(*) FROM ${q}.invoices) AS invoices,
      (SELECT COUNT(*) FROM ${q}.documents WHERE "legacyStatus" IS NULL OR "customerName" IS NULL) AS new_documents,
      (SELECT COUNT(*) FROM ${q}.clients c WHERE NOT EXISTS (SELECT 1 FROM ${q}.documents d WHERE d."clientId" = c.id)) AS new_clients`, transaction);
    if (Number(counts.invoices) || Number(counts.new_documents) || Number(counts.new_clients)) {
      throw new Error('No se puede revertir sin perder datos nuevos. Exportá/reconciliá las facturas y documentos primero.');
    }
    await sql(`ALTER TABLE ${q}.users DROP CONSTRAINT users_role_check`, transaction);
    await sql(`UPDATE ${q}.users u SET role = b.role FROM ${q}.billing_legacy_roles b WHERE u.id = b.id`, transaction);
    await sql(`DROP TABLE ${q}.billing_legacy_roles`, transaction);
    await sql(`DROP TABLE ${q}.invoices`, transaction);
    await sql(`DROP TYPE ${q}.enum_invoices_type, ${q}.enum_invoices_status`, transaction);
    await sql(`ALTER TABLE ${q}.documents DROP COLUMN type, DROP COLUMN "clientId", DROP COLUMN "isExport", DROP COLUMN status`, transaction);
    await sql(`DROP TYPE ${q}.enum_documents_type, ${q}.enum_documents_status`, transaction);
    await sql(`DROP TABLE ${q}.clients`, transaction);
    await sql(`DROP TYPE ${q}.enum_clients_taxCondition`, transaction);
    await sql(`ALTER TABLE ${q}.documents RENAME COLUMN "legacyStatus" TO status`, transaction);
    await sql(`ALTER TABLE ${q}.documents ALTER COLUMN status SET NOT NULL, ALTER COLUMN "customerName" SET NOT NULL`, transaction);
    await sql(`ALTER TYPE ${q}.enum_documents_legacyStatus RENAME TO enum_invoices_status`, transaction);
    const [constraints] = await sql(`SELECT conname FROM pg_constraint WHERE conrelid = '${q}.documents'::regclass AND contype IN ('p','u')`, transaction);
    for (const { conname } of constraints) {
      const oldName = queryInterface.queryGenerator.quoteIdentifier(conname);
      const newName = queryInterface.queryGenerator.quoteIdentifier(conname.replace(/^legacy_documents_/, ''));
      await sql(`ALTER TABLE ${q}.documents RENAME CONSTRAINT ${oldName} TO ${newName}`, transaction);
    }
    await sql(`ALTER SEQUENCE ${q}.documents_id_seq RENAME TO invoices_id_seq`, transaction);
    await sql(`ALTER TABLE ${q}.documents RENAME TO invoices`, transaction);
  });
}
