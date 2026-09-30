export const authContext = {
  description: 'Autenticación para operar la API con un usuario habilitado.',
  fields: {
    accessToken: 'Token de acceso para enviar en Authorization: Bearer <accessToken>.',
    tokenType: 'Tipo de token: Bearer.',
    expiresIn: 'Tiempo de validez del token en segundos.',
  },
  rules: [
    'POST /auth/login recibe email y password.',
    'Regular puede operar todos los clientes, documentos y facturas; la administración de usuarios requiere admin.',
    'Si el token expira, iniciar sesión nuevamente. No compartir credenciales ni el token con el modelo.',
  ],
};
