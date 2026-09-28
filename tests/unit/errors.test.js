import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UniqueConstraintError, ForeignKeyConstraintError } from 'sequelize';
import { handleUniqueConstraintError } from '../../src/errors/unique-constraint-error.js';
import { handleMalformedJsonError } from '../../src/errors/malformed-json-error.js';
import { handleAuthorizationError, AuthorizationError } from '../../src/errors/authorization-error.js';
import { handleUserNotFoundError, UserNotFoundError } from '../../src/errors/user-not-found-error.js';
import { handleDeleteUserError } from '../../src/middleweres/handle-delete-user-error.js';
import { errorHandler } from '../../src/middleweres/error-handler.js';
import { USER_ERROR_MESSAGES as U, REQUEST_ERROR_MESSAGES as Q } from '../../src/constants/constants.js';

function response() {
  return {
    statusCode: null, body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function unique(options) {
  return new UniqueConstraintError(options);
}

test('unique constraint error detects username by constraint, fields, paths and database detail', () => {
  const variants = [
    { parent: { constraint: 'users_username_key' } },
    { fields: { username: 'existing' } },
    { errors: [{ path: 'username' }] },
    { parent: { detail: 'Key (username)=(existing) already exists.' } },
  ];
  for (const options of variants) {
    const res = response();
    assert.equal(handleUniqueConstraintError(unique(options), res), true);
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.error, U.USERNAME_ALREADY_EXISTS);
  }
});

test('unique constraint error detects email by constraint, fields, paths and database detail', () => {
  const variants = [
    { parent: { constraint: 'users_email_key' } },
    { fields: { email: 'existing' } },
    { errors: [{ path: 'email' }] },
    { parent: { detail: 'Key (email)=(existing) already exists.' } },
  ];
  for (const options of variants) {
    const res = response();
    assert.equal(handleUniqueConstraintError(unique(options), res), true);
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.error, U.EMAIL_ALREADY_EXISTS);
  }
});

test('unknown unique constraint returns a controlled 500, and unrelated errors pass through', () => {
  const res = response();
  const previous = console.error;
  let logged;
  console.error = (...args) => { logged = args; };
  try {
    assert.equal(handleUniqueConstraintError(unique({ parent: { constraint: 'other_key' } }), res), true);
  } finally { console.error = previous; }
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error, U.UNIQUE_CONSTRAINT_FAILED);
  assert.equal(logged[0], U.UNIQUE_CONSTRAINT_FAILED);
  assert.equal(handleUniqueConstraintError(new Error('other'), response()), false);
});

test('malformed JSON and domain errors map to their expected statuses only', () => {
  const malformed = new SyntaxError('bad json');
  malformed.status = 400;
  malformed.body = '{';
  const bad = response();
  assert.equal(handleMalformedJsonError(malformed, bad), true);
  assert.equal(bad.statusCode, 400);
  assert.deepEqual(bad.body.errors, [{ field: 'body', message: Q.MALFORMED_JSON }]);
  for (const invalid of [new Error('bad'), Object.assign(new SyntaxError('bad'), { status: 500 })]) {
    assert.equal(handleMalformedJsonError(invalid, response()), false);
  }
  const forbidden = response();
  assert.equal(handleAuthorizationError(new AuthorizationError('no'), forbidden), true);
  assert.deepEqual(forbidden.body, { error: 'no' });
  assert.equal(forbidden.statusCode, 403);
  assert.equal(handleAuthorizationError(new Error('no'), response()), false);
  const missing = response();
  assert.equal(handleUserNotFoundError(new UserNotFoundError(), missing), true);
  assert.equal(missing.statusCode, 404);
  assert.equal(handleUserNotFoundError(new Error('missing'), response()), false);
});

test('delete foreign key errors map to 409 and unrelated errors continue', () => {
  const res = response();
  let continued;
  const next = (error) => { continued = error; };
  const constraint = new ForeignKeyConstraintError({ parent: new Error('fk') });
  handleDeleteUserError(constraint, {}, res, next);
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error, U.HAS_RELATED_RECORDS);
  const other = new Error('other');
  handleDeleteUserError(other, {}, response(), next);
  assert.equal(continued, other);
});

test('central handler routes known errors and shields unexpected error details', () => {
  const known = [
    [new AuthorizationError('denied'), 403],
    [new UserNotFoundError(), 404],
    [unique({ fields: { email: 'x' } }), 409],
  ];
  for (const [error, expected] of known) {
    const res = response();
    errorHandler(error, {}, res, () => {});
    assert.equal(res.statusCode, expected);
  }
  const previous = console.error;
  let logged;
  console.error = (error) => { logged = error; };
  try {
    const res = response();
    const unexpected = new Error('private database detail');
    errorHandler(unexpected, {}, res, () => {});
    assert.equal(logged, unexpected);
    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { error: Q.INTERNAL_SERVER_ERROR });
  } finally { console.error = previous; }
});
