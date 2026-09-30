import {
  CLIENT_TAX_CONDITIONS as TAX,
  DOCUMENT_TYPES,
  DOCUMENT_STATUSES,
  USER_ROLES,
} from '../../constants/constants.js';

export const demoUsers = [
  {
    username: 'demo_admin',
    email: 'admin@example.com',
    password: 'AdminDemo123!',
    role: USER_ROLES.ADMIN,
  },
  {
    username: 'demo_regular',
    email: 'regular@example.com',
    password: 'RegularDemo123!',
    role: USER_ROLES.REGULAR,
  },
];

export const demoClients = [
  {
    name: 'Demo Responsable Inscripto',
    taxId: '30-12345678-9',
    country: 'AR',
    taxCondition: TAX.REGISTERED,
    address: 'Mitre 100',
  },
  {
    name: 'Demo Monotributista',
    taxId: '20-23456789-1',
    country: 'AR',
    taxCondition: TAX.MONOTAX,
    address: 'Mitre 200',
  },
  {
    name: 'Demo Consumidor Final',
    taxId: '34567890',
    country: 'AR',
    taxCondition: TAX.FINAL_CONSUMER,
    address: 'Mitre 300',
  },
  {
    name: 'Demo Exento',
    taxId: '30-45678901-2',
    country: 'AR',
    taxCondition: TAX.EXEMPT,
    address: 'Mitre 400',
  },
  {
    name: 'Demo Exportación',
    taxId: 'DEMO-UY-001',
    country: 'UY',
    taxCondition: null,
    address: '18 de Julio 500, Montevideo',
  },
];

const documentGroups = [
  [DOCUMENT_TYPES.SALES_ORDER, 150],
  [DOCUMENT_TYPES.PURCHASE_ORDER, 38],
  [DOCUMENT_TYPES.QUOTE, 38],
  [DOCUMENT_TYPES.DELIVERY_NOTE, 37],
  [DOCUMENT_TYPES.CREDIT_NOTE, 37],
];

export function toDemoDocuments(user, clients) {
  return documentGroups.flatMap(([type, count]) =>
    Array.from({ length: count }, (_, index) => {
      const client = clients[index % clients.length];
      return {
        number: `DEMO-${type}-${String(index + 1).padStart(4, '0')}`,
        type,
        userId: user.id,
        clientId: client.id,
        amount: (1000 + index * 25).toFixed(2),
        isExport: client.country !== 'AR',
        status: DOCUMENT_STATUSES.PENDING,
      };
    }),
  );
}
