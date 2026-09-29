# Billing model transition

This branch includes Sequelize models and explicit migrations (see migrations.md). Do not bootstrap or deploy against the existing database before running the documented migration. Existing invoice endpoints, Swagger, seeds and authorization still describe the previous API and must be adapted in the next phase.

## Model

- `users`: only `regular` and `admin` are accepted by the model.
- `clients`: name/legal name, tax identification, tax condition, country (ISO alpha-2) and address. Argentine clients require a tax condition; foreign clients may omit it.
- `documents`: replaces the old invoice records. `type = OV` is a sales order; `status` is pending, invoiced or cancelled. `clientId` identifies the customer; `userId` identifies the operating user. `isExport` describes the operation, independently of customer residence.
- `invoices`: a new generated invoice with type A/B/E, a unique `documentId`, client and issuing user. Customer data is copied as a historical snapshot.

Deleting referenced users, clients or documents is restricted. One sales order generates one complete invoice; partial invoicing is outside the demo scope. The invoicing service must enforce client/owner consistency, tax rules, permissions and atomically create the invoice and mark the document invoiced.

## Rules for the next service phase

The issuer is assumed to be an Argentine VAT registered taxpayer. Exports produce E; local sales to VAT registered or monotributo clients produce A; local sales to final consumers or VAT exempt clients produce B. Company/legal name alone does not select a letter. These are demo records, without ARCA fiscal authorization.

Admin can access all endpoints, including users and clients. Regular can access documents and invoices, but no users endpoints. Superadmin permissions must be removed when routes are adapted. Login remains available for authentication.

## Migration strategy

Rename existing invoices to documents before creating the new invoices table; reconcile historical customer names into clients and backfill clientId before enforcing NOT NULL. Explicitly map legacy document statuses and existing superadmin accounts to the new model. Review incompatible historical data before applying these changes. Sequelize sync must not be used to perform this transition.
