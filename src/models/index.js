import registerAssociations from './associations.js';
import Client from './client.js';
import Document from './document.js';
import Invoice from './invoice.js';
import User from './user.js';

registerAssociations({ Client, Document, Invoice, User });

export { Client, Document, Invoice, User };
