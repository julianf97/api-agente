import 'dotenv/config';

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('Falta configurar JWT_SECRET.');
}

export { jwtSecret };