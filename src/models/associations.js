export default function registerAssociations({ Invoice, User }) {
  User.hasMany(Invoice, { foreignKey: 'userId', onDelete: 'RESTRICT' });
  Invoice.belongsTo(User, { foreignKey: 'userId', onDelete: 'RESTRICT' });
}
