import { describe, expect, test } from '@jest/globals';
import { UniqueConstraintError, ForeignKeyConstraintError } from 'sequelize';
import { handleUniqueConstraintError } from '../../src/errors/unique-constraint-error.js';
import { handleMalformedJsonError } from '../../src/errors/malformed-json-error.js';
import {
  handleAuthorizationError,
  AuthorizationError,
} from '../../src/errors/authorization-error.js';
import {
  handleUserNotFoundError,
  UserNotFoundError,
} from '../../src/errors/user-not-found-error.js';
import { handleDeleteUserError } from '../../src/middleweres/handle-delete-user-error.js';
import { errorHandler } from '../../src/middleweres/error-handler.js';
import {
  USER_ERROR_MESSAGES as U,
  REQUEST_ERROR_MESSAGES as Q,
} from '../../src/constants/constants.js';

function response() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function unique(options) {
  return new UniqueConstraintError(options);
}

describe('Manejo de errores', () => {
  test('unique constraint error detects username by constraint, fields, paths and database detail', () => {
    const variants = [
      { parent: { constraint: 'users_username_key' } },
      { fields: { username: 'existing' } },
      { errors: [{ path: 'username' }] },
      { parent: { detail: 'Key (username)=(existing) already exists.' } },
    ];
    for (const options of variants) {
      const res = response();
      expect(handleUniqueConstraintError(unique(options), res)).toBe(true);
      expect(res.statusCode).toBe(409);
      expect(res.body.error).toBe(U.USERNAME_ALREADY_EXISTS);
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
      expect(handleUniqueConstraintError(unique(options), res)).toBe(true);
      expect(res.statusCode).toBe(409);
      expect(res.body.error).toBe(U.EMAIL_ALREADY_EXISTS);
    }
  });

  test('unknown unique constraint returns a controlled 409, and unrelated errors pass through', () => {
    const res = response();
    const previous = console.error;
    let logged;
    console.error = (...args) => {
      logged = args;
    };
    try {
      expect(
        handleUniqueConstraintError(
          unique({ parent: { constraint: 'other_key' } }),
          res,
        ),
      ).toBe(true);
    } finally {
      console.error = previous;
    }
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/únicos/);
    expect(handleUniqueConstraintError(new Error('other'), response())).toBe(
      false,
    );
  });

  test('malformed JSON and domain errors map to their expected statuses only', () => {
    const malformed = new SyntaxError('bad json');
    malformed.status = 400;
    malformed.body = '{';
    const bad = response();
    expect(handleMalformedJsonError(malformed, bad)).toBe(true);
    expect(bad.statusCode).toBe(400);
    expect(bad.body.errors).toStrictEqual([
      { field: 'body', message: Q.MALFORMED_JSON },
    ]);
    for (const invalid of [
      new Error('bad'),
      Object.assign(new SyntaxError('bad'), { status: 500 }),
    ]) {
      expect(handleMalformedJsonError(invalid, response())).toBe(false);
    }
    const forbidden = response();
    expect(
      handleAuthorizationError(new AuthorizationError('no'), forbidden),
    ).toBe(true);
    expect(forbidden.body).toStrictEqual({ error: 'no' });
    expect(forbidden.statusCode).toBe(403);
    expect(handleAuthorizationError(new Error('no'), response())).toBe(false);
    const missing = response();
    expect(handleUserNotFoundError(new UserNotFoundError(), missing)).toBe(
      true,
    );
    expect(missing.statusCode).toBe(404);
    expect(handleUserNotFoundError(new Error('missing'), response())).toBe(
      false,
    );
  });

  test('delete foreign key errors map to 409 and unrelated errors continue', () => {
    const res = response();
    let continued;
    const next = (error) => {
      continued = error;
    };
    const constraint = new ForeignKeyConstraintError({
      parent: new Error('fk'),
    });
    handleDeleteUserError(constraint, {}, res, next);
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toBe(U.HAS_RELATED_RECORDS);
    const other = new Error('other');
    handleDeleteUserError(other, {}, response(), next);
    expect(continued).toBe(other);
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
      expect(res.statusCode).toBe(expected);
    }
    const previous = console.error;
    let logged;
    console.error = (error) => {
      logged = error;
    };
    try {
      const res = response();
      const unexpected = new Error('private database detail');
      errorHandler(unexpected, {}, res, () => {});
      expect(logged).toBe(unexpected);
      expect(res.statusCode).toBe(500);
      expect(res.body).toStrictEqual({ error: Q.INTERNAL_SERVER_ERROR });
    } finally {
      console.error = previous;
    }
  });
});
