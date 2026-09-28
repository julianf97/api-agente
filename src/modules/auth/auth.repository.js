import User from '../../models/user.js';

export async function findUserByEmail(email) {
  return User.findOne({
    where: { email },
  });
}