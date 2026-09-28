export function handleMalformedJsonError(error, res) {
  if (!(error instanceof SyntaxError && error.status === 400 && 'body' in error)) {
    return false;
  }

  res.status(400).json({
    errors: [
      { field: 'body', message: 'El JSON enviado no es válido.' },
    ],
  });

  return true;
}