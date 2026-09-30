export function toInvoiceResponse(invoice) {
  return {
    id: invoice.id,
    number: invoice.number,
    documentId: invoice.documentId,
    clientId: invoice.clientId,
    userId: invoice.userId,
    type: invoice.type,
    customerName: invoice.customerName,
    customerTaxId: invoice.customerTaxId,
    customerTaxCondition: invoice.customerTaxCondition,
    customerCountry: invoice.customerCountry,
    customerAddress: invoice.customerAddress,
    amount: invoice.amount,
    status: invoice.status,
    issuedAt: invoice.issuedAt,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
  };
}
