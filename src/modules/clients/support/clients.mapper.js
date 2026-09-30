export function toClientCreationData(data) {
  return { country: 'AR', taxCondition: null, ...data };
}

export function toClientTaxValidationData(client, data) {
  return { ...client.get({ plain: true }), ...data };
}
