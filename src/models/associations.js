export default function registerAssociations({ Client, Document, Invoice, User }) {
  const restricted = { onDelete: 'RESTRICT', onUpdate: 'CASCADE' };
  for (const Model of [Document, Invoice]) {
    User.hasMany(Model, { foreignKey: 'userId', ...restricted });
    Model.belongsTo(User, { foreignKey: 'userId', ...restricted });
    Client.hasMany(Model, { foreignKey: 'clientId', ...restricted });
    Model.belongsTo(Client, { foreignKey: 'clientId', ...restricted });
  }
  Document.hasOne(Invoice, { foreignKey: 'documentId', ...restricted });
  Invoice.belongsTo(Document, { foreignKey: 'documentId', ...restricted });
}
