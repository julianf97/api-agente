export function toInvoiceResponse(invoice) {
  return {
    id: invoice.id,
    number: invoice.number,
    userId: invoice.userId,
    customerName: invoice.customerName,
    amount: invoice.amount,
    status: invoice.status,
    issuedAt: invoice.issuedAt,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
  };
}
