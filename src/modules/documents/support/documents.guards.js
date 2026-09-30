import { USER_ROLES, DOCUMENT_STATUSES } from '../../../constants/constants.js';
import { BillingError } from '../../../errors/billing-error.js';
import { AuthorizationError } from '../../../errors/authorization-error.js';

export function documentVisibility(actor) {
  return actor?.role === USER_ROLES.ADMIN ? {} : { userId: Number(actor.sub) };
}

export function assertCanReadDocument(actor, document) {
  if (
    !document ||
    (actor?.role !== USER_ROLES.ADMIN && document.userId !== Number(actor?.sub))
  ) {
    throw new BillingError('Documento no encontrado.', 404);
  }
}

export function assertCanAssignOwner(actor, data) {
  if (actor?.role !== USER_ROLES.ADMIN && data.userId !== undefined)
    throw new AuthorizationError();
}

export function assertPendingDocument(document) {
  if (document.status !== DOCUMENT_STATUSES.PENDING) {
    throw new BillingError(
      'Solo se puede modificar o eliminar una orden pendiente.',
    );
  }
}
