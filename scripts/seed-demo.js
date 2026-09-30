import 'dotenv/config';
import { sequelize } from '../src/db/index.js';
import { seedDemo } from '../src/db/demo/demo.service.js';

try {
  await sequelize.authenticate();
  console.log('Documentos de demo:', await seedDemo());
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
