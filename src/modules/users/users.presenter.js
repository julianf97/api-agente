export function toUserResponse(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    enabled: user.enabled,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
