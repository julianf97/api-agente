import User from '../../models/user.js';

export async function createUser(data) {
  return User.create(data);
}