import { DataTypes } from 'sequelize';

export default function defineInvoice(sequelize, schema, User) {
  return sequelize.define(
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
      schema,
      tableName: 'invoices',
      timestamps: true,
    },
  );
}
