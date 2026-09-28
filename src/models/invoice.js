// src/models/invoice.model.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../db/index.js';
import User from './user.js';

const Invoice = sequelize.define(
  'Invoice',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    customerName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('draft', 'issued', 'paid', 'cancelled'),
      allowNull: false,
    },
    issuedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    schema: 'public',
    tableName: 'invoices',
    timestamps: true,
  },
);

export default Invoice;