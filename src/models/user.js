import { DataTypes } from 'sequelize';
import { USER_ROLES } from '../constants/constants.js';
import { sequelize } from '../db/index.js';

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: USER_ROLES.REGULAR,
      validate: {
        isIn: [[
          USER_ROLES.REGULAR,
          USER_ROLES.ADMIN,
        ]],
      },
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    schema: process.env.DB_USE_TEST_SCHEMA === 'true'
      ? process.env.DB_TEST_SCHEMA
      : process.env.DB_SCHEMA,
    tableName: 'users',
    timestamps: true,
  },
);

export default User;