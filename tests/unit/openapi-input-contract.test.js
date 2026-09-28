import { expect, test } from '@jest/globals';
import express from 'express';
import { openApiDocument } from '../../src/swagger/index.js';
import { createUserValidation } from '../../src/modules/users/validators/createUser.validator.js';
import { updateUserValidation } from '../../src/modules/users/validators/updateUser.validator.js';
import { loginValidation } from '../../src/modules/auth/login.validator.js';
import { handleValidation } from '../../src/middleweres/handle-validation.js';
import {
  EMAIL_MAX_LENGTH, PASSWORD_MAX_UTF8_BYTES, USERNAME_MAX_LENGTH,
} from '../../src/constants/validation-limits.js';

test('request documentation exposes normalization and UTF-8 limits used by the validators', async () => {
  const schemas = openApiDocument.components.schemas;
  for (const name of ['CreateUserRequest', 'UpdateUserRequest']) {
    const { username, email, password } = schemas[name].properties;
    expect(username['x-trim-before-validation']).toBe(true);
    expect(username['x-maxLengthAfterTrim']).toBe(USERNAME_MAX_LENGTH);
    expect(email['x-trim-before-validation']).toBe(true);
    expect(email['x-email-validator']).toBe('express-validator isEmail');
    expect(email['x-maxLengthAfterTrim']).toBe(EMAIL_MAX_LENGTH);
    expect(password['x-maxUtf8Bytes']).toBe(PASSWORD_MAX_UTF8_BYTES);
    expect(new RegExp(password.pattern).test('   ')).toBe(false);
    expect(new RegExp(password.pattern).test(' a ')).toBe(true);
  }

  const app = express();
  app.use(express.json());
  app.post('/create', createUserValidation, handleValidation, (req, res) => res.json(req.validatedBody));
  app.patch('/update/:id', updateUserValidation, handleValidation, (req, res) => res.json(req.validatedBody));
  app.post('/login', loginValidation, handleValidation, (req, res) => res.json(req.validatedBody));
  const server = app.listen(0);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    async function send(path, method, body) {
      const response = await fetch(base + path, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      return { status: response.status, data: await response.json() };
    }
    const valid = { username: '  alice  ', email: '  ALICE@example.com  ', password: 'é'.repeat(36) };
    const created = await send('/create', 'POST', valid);
    expect(created.status).toBe(200);
    expect(created.data.username).toBe('alice');
    expect(created.data.email).toBe('ALICE@example.com');
    expect((await send('/create', 'POST', { ...valid, password: 'é'.repeat(37) })).status).toBe(400);
    expect((await send('/create', 'POST', { ...valid, password: '   ' })).status).toBe(400);
    expect((await send('/create', 'POST', { ...valid, username: '  ' + 'a'.repeat(255) + '  ' })).status).toBe(200);
    expect((await send('/create', 'POST', { ...valid, username: 'a'.repeat(256) })).status).toBe(400);
    expect((await send('/update/1', 'PATCH', { password: 'é'.repeat(37) })).status).toBe(400);
    expect((await send('/login', 'POST', { email: '  ALICE@example.com  ', password: '   ' })).status).toBe(200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
