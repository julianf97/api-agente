import registerAssociations from './associations.js';
import defineInvoice from './invoice.js';
import defineUser from './user.js';

function registerModels(sequelize, schema) {
  const User = defineUser(sequelize, schema);
  const Invoice = defineInvoice(sequelize, schema, User);

  registerAssociations({ Invoice, User });

  return { Invoice, User };
}

export { registerModels };
