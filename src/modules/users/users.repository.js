import User from '../../models/user.js';

export async function findUsers({ limit, offset }) {
  return User.findAndCountAll({
    attributes: {
      exclude: ['passwordHash'],
    },
    order: [['id', 'ASC']],
    limit,
    offset,
  });
}

export async function createUser(data) {
  return User.create(data);
}

export async function findUserById(id) {
  return User.findByPk(id);
}

export async function updateUser(user, data) {
  return user.update(data);
}

export async function deleteUser(user) {
  return user.destroy();
}