import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';
import { modelOptions } from './options.js';
import { INVOICE_TYPES } from '../constants/billing.js';
import { INVOICE_STATUSES } from '../constants/constants.js';
import Document from './document.js';
import Client from './client.js';
import User from './user.js';

const Invoice = sequelize.define('Invoice', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  number: { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { notEmpty: true } },
  // One complete invoice per sales order. Uniqueness also prevents concurrent duplicates.
  documentId: { type: DataTypes.INTEGER, allowNull: false, unique: true, references: { model: Document, key: 'id' } },
  clientId: { type: DataTypes.INTEGER, allowNull: false, references: { model: Client, key: 'id' } },
  userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'id' } },
  type: { type: DataTypes.ENUM(...Object.values(INVOICE_TYPES)), allowNull: false },
  // Snapshot: later edits to the client must not change the issued invoice.
  customerName: { type: DataTypes.STRING(255), allowNull: false, validate: { notEmpty: true } },
  customerTaxId: { type: DataTypes.STRING(32), allowNull: false, validate: { notEmpty: true } },
  customerTaxCondition: { type: DataTypes.STRING(32), allowNull: true },
  customerCountry: { type: DataTypes.STRING(2), allowNull: false, validate: { is: /^[A-Z]{2}$/ } },
  customerAddress: { type: DataTypes.STRING(255), allowNull: false, validate: { notEmpty: true } },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, validate: { min: 0.01, max: 9999999999.99 } },
  status: { type: DataTypes.ENUM(...Object.values(INVOICE_STATUSES)), allowNull: false, defaultValue: INVOICE_STATUSES.ISSUED },
  issuedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, modelOptions('invoices'));

export default Invoice;
