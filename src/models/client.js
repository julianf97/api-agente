import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';
import { modelOptions } from './options.js';
import { CLIENT_TAX_CONDITIONS } from '../constants/billing.js';

const Client = sequelize.define('Client', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(255), allowNull: false, validate: { notEmpty: true } },
  // CUIT for local clients; foreign tax identification for export clients.
  taxId: { type: DataTypes.STRING(32), allowNull: false, validate: { notEmpty: true } },
  taxCondition: {
    type: DataTypes.ENUM(...Object.values(CLIENT_TAX_CONDITIONS)),
    allowNull: true,
  },
  // ISO 3166-1 alpha-2. Country alone does not determine an export operation.
  country: {
    type: DataTypes.STRING(2), allowNull: false, defaultValue: 'AR',
    validate: { is: /^[A-Z]{2}$/ },
  },
  address: { type: DataTypes.STRING(255), allowNull: false, validate: { notEmpty: true } },
}, {
  ...modelOptions('clients'),
  indexes: [{ unique: true, fields: ['country', 'taxId'] }],
  validate: {
    localTaxConditionRequired() {
      if (this.country === 'AR' && !this.taxCondition) {
        throw new Error('Los clientes argentinos requieren condición fiscal.');
      }
    },
  },
});

export default Client;
