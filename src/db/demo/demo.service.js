import { USER_ROLES } from '../../constants/constants.js';
import { hashUserPassword } from '../../modules/users/support/users.mapper.js';
import { demoUsers, demoClients, toDemoDocuments } from './demo.data.js';
import { assertDemoDatabase, assertDemoUser } from './demo.guards.js';
import {
  inDemoTransaction,
  lockDemoSeed,
  findDemoUser,
  createDemoUser,
  findOrCreateDemoClient,
  findOrCreateDemoDocument,
} from './demo.repository.js';

async function ensureDemoUser({ password, ...data }, transaction) {
  const existing = await findDemoUser(data.email, transaction);
  if (existing) {
    assertDemoUser(existing, data.role);
    return existing;
  }
  return createDemoUser({
    ...data,
    enabled: true,
    passwordHash: await hashUserPassword(password),
  }, transaction);
}

export async function seedDemo() {
  assertDemoDatabase();
  return inDemoTransaction(async (transaction) => {
    await lockDemoSeed(transaction);
    const users = [];
    for (const data of demoUsers) {
      users.push(await ensureDemoUser(data, transaction));
    }
    const clients = [];
    for (const data of demoClients) {
      clients.push(await findOrCreateDemoClient(data, transaction));
    }
    const regular = users.find((user) => user.role === USER_ROLES.REGULAR);
    let created = 0;
    for (const data of toDemoDocuments(regular, clients)) {
      if (await findOrCreateDemoDocument(data, transaction)) created += 1;
    }
    return { expected: 300, created, existing: 300 - created };
  });
}
