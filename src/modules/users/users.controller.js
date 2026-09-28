import {
  createUser as createUserService,
  updateUser as updateUserService,
  deleteUser as deleteUserService,
} from './users.service.js';

export async function createUser(req, res, next) {
  try {
    const user = await createUserService(req.validatedBody);

    return res.status(201).json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      enabled: user.enabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    const user = await updateUserService(req.params.id, req.validatedBody);

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado.',
      });
    }

    return res.status(200).json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      enabled: user.enabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    return next(error);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const deleted = await deleteUserService(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        error: 'Usuario no encontrado.',
      });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}