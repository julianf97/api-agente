import { DOCUMENT_STATUSES } from '../../../constants/constants.js';
import { BillingError } from '../../../errors/billing-error.js';

export function assertDocumentExists(document) {
  if (!document) throw new BillingError('Documento no encontrado.', 404);
}

export function assertPendingDocument(document) {
  if (document.status !== DOCUMENT_STATUSES.PENDING) {
    throw new BillingError(
      'Solo se puede modificar o eliminar una orden pendiente.',
    );
  }
}
