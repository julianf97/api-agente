import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';
import { modelOptions } from './options.js';
import { DOCUMENT_STATUSES, DOCUMENT_TYPES } from '../constants/billing.js';
import Client from './client.js';
import User from './user.js';

const Document = sequelize.define('Document', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  number: { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { notEmpty: true } },
  type: { type: DataTypes.ENUM(...Object.values(DOCUMENT_TYPES)), allowNull: false, defaultValue: DOCUMENT_TYPES.SALES_ORDER },
  userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'id' } },
  clientId: { type: DataTypes.INTEGER, allowNull: false, references: { model: Client, key: 'id' } },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, validate: { min: 0.01, max: 9999999999.99 } },
  isExport: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  status: { type: DataTypes.ENUM(...Object.values(DOCUMENT_STATUSES)), allowNull: false, defaultValue: DOCUMENT_STATUSES.PENDING },
  issuedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  ...modelOptions('documents'),
  indexes: [{ fields: ['type', 'status', 'userId'] }, { fields: ['clientId'] }],
});

export default Document;
