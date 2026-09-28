import { AUTH_ERROR_MESSAGES } from '../../constants/constants.js';
import { login as loginService } from './auth.service.js';

export async function login(req, res, next) {
  try {
    const result = await loginService(req.validatedBody);

    if (!result) {
      return res.status(401).json({
        error: AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS,
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}