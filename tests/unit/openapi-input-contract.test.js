import assert from 'node:assert/strict';
import { test } from 'node:test';
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
    assert.equal(username['x-trim-before-validation'], true);
    assert.equal(username['x-maxLengthAfterTrim'], USERNAME_MAX_LENGTH);
    assert.equal(email['x-trim-before-validation'], true);
    assert.equal(email['x-email-validator'], 'express-validator isEmail');
    assert.equal(email['x-maxLengthAfterTrim'], EMAIL_MAX_LENGTH);
    assert.equal(password['x-maxUtf8Bytes'], PASSWORD_MAX_UTF8_BYTES);
    assert.equal(new RegExp(password.pattern).test('   '), false);
    assert.equal(new RegExp(password.pattern).test(' a '), true);
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
    assert.equal(created.status, 200);
    assert.equal(created.data.username, 'alice');
    assert.equal(created.data.email, 'ALICE@example.com');
    assert.equal((await send('/create', 'POST', { ...valid, password: 'é'.repeat(37) })).status, 400);
    assert.equal((await send('/create', 'POST', { ...valid, password: '   ' })).status, 400);
    assert.equal((await send('/create', 'POST', { ...valid, username: '  ' + 'a'.repeat(255) + '  ' })).status, 200);
    assert.equal((await send('/create', 'POST', { ...valid, username: 'a'.repeat(256) })).status, 400);
    assert.equal((await send('/update/1', 'PATCH', { password: 'é'.repeat(37) })).status, 400);
    assert.equal((await send('/login', 'POST', { email: '  ALICE@example.com  ', password: '   ' })).status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
