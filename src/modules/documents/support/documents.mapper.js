import { DOCUMENT_STATUSES } from '../../../constants/constants.js';

export function toDocumentCreationData(data, actor) {
  return {
    ...data,
    userId: data.userId ?? Number(actor.sub),
    status: DOCUMENT_STATUSES.PENDING,
  };
}
