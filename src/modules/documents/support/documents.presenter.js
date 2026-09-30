export function toDocumentResponse(document) {
  return {
    id: document.id,
    number: document.number,
    type: document.type,
    userId: document.userId,
    clientId: document.clientId,
    amount: document.amount,
    isExport: document.isExport,
    status: document.status,
    issuedAt: document.issuedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
