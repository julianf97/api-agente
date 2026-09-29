import { matchedData } from 'express-validator';
import {
  createUser as createUserService,
  listUsers as listUsersService,
  getUserById as getUserByIdService,
  updateUser as updateUserService,
  changeUserRole as changeUserRoleService,
  deleteUser as deleteUserService,
} from './users.service.js';
import { toUserResponse } from './support/users.presenter.js';

export async function createUser(req, res, next) {
  try {
    const user = await createUserService(req.validatedBody, req.auth);

    return res.status(201).json(toUserResponse(user));
  } catch (error) {
    return next(error);
  }
}

export async function listUsers(req, res, next) {
  try {
    const pagination = matchedData(req, { locations: ['query'] });
    const result = await listUsersService(pagination);

    return res.status(200).json({
      users: result.users.map(toUserResponse),
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getUserById(req, res, next) {
  try {
    const user = await getUserByIdService(req.params.id);

    return res.status(200).json(toUserResponse(user));
  } catch (error) {
    return next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    const user = await updateUserService(
      req.params.id,
      req.validatedBody,
      req.auth,
    );

    return res.status(200).json(toUserResponse(user));
  } catch (error) {
    return next(error);
  }
}

export async function changeUserRole(req, res, next) {
  try {
    const user = await changeUserRoleService(
      req.params.id,
      req.validatedBody.role,
      req.auth,
    );

    return res.status(200).json(toUserResponse(user));
  } catch (error) {
    return next(error);
  }
}

export async function deleteUser(req, res, next) {
  try {
    await deleteUserService(req.params.id, req.auth);

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}
