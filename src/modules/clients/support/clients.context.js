export const clientContext = {
  "description": "Clientes destinatarios de las facturas. Sus datos fiscales determinan el tipo de factura.",
  "fields": {
    "id": "Identificador del cliente; corresponde al clientId del documento y la factura.",
    "taxId": "Identificación fiscal del cliente.",
    "country": "Código de país ISO de dos letras; AR significa Argentina.",
    "taxCondition": "Condición fiscal: responsable_inscripto, monotributista, consumidor_final o exento; puede ser null para clientes extranjeros."
  },
  "rules": [
    "Los clientes argentinos requieren condición fiscal.",
    "La API guarda una copia histórica de los datos fiscales al emitir la factura.",
    "Admin y regular pueden consultar y operar sobre todos los clientes."
  ]
};
