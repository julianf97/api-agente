import { Router } from 'express';
import {
  createUser,
  listUsers,
  getUserById,
  updateUser,
  changeUserRole,
  deleteUser,
} from './users.controller.js';
import { createUserValidation } from './validators/createUser.validator.js';
import { listUsersValidation } from './validators/listUsers.validator.js';
import { userIdValidation } from './validators/userId.validator.js';
import { updateUserValidation } from './validators/updateUser.validator.js';
import { changeUserRoleValidation } from './validators/changeUserRole.validator.js';
import { deleteUserValidation } from './validators/deleteUser.validator.js';
import { handleValidation } from '../../middleweres/handle-validation.js';
import { handleDeleteUserError } from '../../middleweres/handle-delete-user-error.js';
import { requireRoles } from '../../middleweres/requiere-roles.js';
import { USER_ROLES } from '../../constants/constants.js';

const router = Router();

router.post(
  '/',
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN),
  createUserValidation,
  handleValidation,
  createUser,
);

router.get(
  '/',
  listUsersValidation,
  handleValidation,
  listUsers,
);

router.get(
  '/:id',
  userIdValidation,
  handleValidation,
  getUserById,
);

router.patch(
  '/:id/role',
  requireRoles(USER_ROLES.SUPERADMIN),
  changeUserRoleValidation,
  handleValidation,
  changeUserRole,
);

router.patch(
  '/:id',
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN),
  updateUserValidation,
  handleValidation,
  updateUser,
);

router.delete(
  '/:id',
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN),
  deleteUserValidation,
  handleValidation,
  deleteUser,
  handleDeleteUserError,
);

export default router;