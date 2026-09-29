export default function registerAssociations({ Client, Document, Invoice, User }) {
  User.hasMany(Document, { foreignKey: 'userId', onDelete: 'RESTRICT' });
  Document.belongsTo(User, { foreignKey: 'userId', onDelete: 'RESTRICT' });
  Client.hasMany(Document, { foreignKey: 'clientId', onDelete: 'RESTRICT' });
  Document.belongsTo(Client, { foreignKey: 'clientId', onDelete: 'RESTRICT' });
  User.hasMany(Invoice, { foreignKey: 'userId', onDelete: 'RESTRICT' });
  Invoice.belongsTo(User, { foreignKey: 'userId', onDelete: 'RESTRICT' });
  Client.hasMany(Invoice, { foreignKey: 'clientId', onDelete: 'RESTRICT' });
  Invoice.belongsTo(Client, { foreignKey: 'clientId', onDelete: 'RESTRICT' });
  Document.hasOne(Invoice, { foreignKey: 'documentId', onDelete: 'RESTRICT' });
  Invoice.belongsTo(Document, { foreignKey: 'documentId', onDelete: 'RESTRICT' });
}
