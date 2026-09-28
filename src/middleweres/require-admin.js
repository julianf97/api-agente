export function requireAdmin(req, res, next) {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({
      error: 'No tenés permisos de administrador.',
    });
  }

  return next();
}