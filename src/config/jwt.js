import 'dotenv/config';
import { AUTH_ERROR_MESSAGES } from '../constants/constants.js';

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error(AUTH_ERROR_MESSAGES.JWT_SECRET_REQUIRED);
}

export { jwtSecret };