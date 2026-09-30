export function toClientResponse(client) {
  return {
    id: client.id,
    name: client.name,
    taxId: client.taxId,
    taxCondition: client.taxCondition,
    country: client.country,
    address: client.address,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
}
