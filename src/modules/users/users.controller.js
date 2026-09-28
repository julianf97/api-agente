import { createUser as createUserService } from './users.service.js';

export async function createUser(req, res, next) {
  try {
    const user = await createUserService(req.validatedBody);

    return res.status(201).json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    next(error);
  }
}