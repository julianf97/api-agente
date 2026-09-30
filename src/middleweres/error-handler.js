import { ForeignKeyConstraintError } from 'sequelize';
import { BillingError, handleBillingError } from '../errors/billing-error.js';
import { REQUEST_ERROR_MESSAGES } from '../constants/constants.js';
import { handleAuthorizationError } from '../errors/authorization-error.js';
import { handleMalformedJsonError } from '../errors/malformed-json-error.js';
import { handleUniqueConstraintError } from '../errors/unique-constraint-error.js';
import { handleUserNotFoundError } from '../errors/user-not-found-error.js';
import { handleInvoiceNotFoundError } from '../errors/invoice-not-found-error.js';
import { handleInvoiceNumberConflict } from '../errors/invoice-number-conflict-error.js';

export function errorHandler(error, _req, res, _next) {
  if (error instanceof BillingError && error.status === 400) {
    res
      .status(400)
      .json({ errors: [{ field: 'taxCondition', message: error.message }] });
    return;
  }
  if (handleBillingError(error, res)) return;
  if (error instanceof ForeignKeyConstraintError) {
    res
      .status(409)
      .json({
        error:
          'El registro tiene referencias relacionadas o una referencia inválida.',
      });
    return;
  }
  if (handleAuthorizationError(error, res)) {
    return;
  }

  if (handleMalformedJsonError(error, res)) {
    return;
  }

  if (handleInvoiceNumberConflict(error, res)) {
    return;
  }

  if (handleUniqueConstraintError(error, res)) {
    return;
  }

  if (handleInvoiceNotFoundError(error, res)) {
    return;
  }

  if (handleUserNotFoundError(error, res)) {
    return;
  }

  console.error(error);

  res.status(500).json({
    error: REQUEST_ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
  });
}
