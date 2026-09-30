export function assertDemoDatabase() {
  if (
    !process.env.DB_SCHEMA ||
    process.env.DB_USE_TEST_SCHEMA === 'true' ||
    process.env.DB_SCHEMA === process.env.DB_TEST_SCHEMA ||
    process.env.DB_SCHEMA.endsWith('-test')
  ) {
    throw new Error('La carga de demo requiere un schema de aplicación, separado de tests.');
  }
}

export function assertDemoUser(user, role) {
  if (!user.enabled || user.role !== role) {
    throw new Error('El usuario de demo existente debe estar habilitado y tener el rol esperado.');
  }
}
