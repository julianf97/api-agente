export const documentContext = {
  "description": "Documentos comerciales de cinco tipos. Solo OV (orden de venta) puede generar una factura en este flujo. OC, PR, RE y NC se registran como documentos de demo; no generan facturas ni efectos contables.",
  "fields": {
    "id": "Identificador que debe enviarse como documentId al crear la factura.",
    "number": "Número de la orden; no es el número de la factura.",
    "type": "OV: orden de venta; OC: orden de compra; PR: presupuesto; RE: remito; NC: nota de crédito.",
    "status": "pending: documento pendiente (solo OV puede facturarse); invoiced: ya facturada; cancelled: cancelada.",
    "clientId": "Cliente destinatario; se consulta en GET /clients/{clientId}.",
    "userId": "Usuario asociado a la orden; no restringe el acceso del usuario regular.",
    "amount": "Importe decimal representado como string para conservar la precisión.",
    "isExport": "true indica exportación y genera factura E.",
    "issuedAt": "Fecha de emisión del documento; puede ser null."
  },
  "rules": [
    "Para facturar, seleccionar únicamente documentos con type OV y status pending.",
    "Crear la factura con POST /invoices enviando solo number (número de factura único) y documentId.",
    "La API determina el tipo de factura y copia importe, usuario y cliente de la orden.",
    "Cada orden admite una única factura. La emisión cambia su estado a invoiced en la misma transacción.",
    "No facturar documentos invoiced ni cancelled. Solo los documentos pending se pueden editar o eliminar.",
    "Los listados son paginados: recorrer hasta pagination.totalPages; page y limit no filtran tipo ni estado."
  ]
};
