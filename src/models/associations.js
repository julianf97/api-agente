export default function registerAssociations({ Invoice, User }) {
  User.hasMany(Invoice, { foreignKey: 'userId' });
  Invoice.belongsTo(User, { foreignKey: 'userId' });
}
