export const invoiceContext = {
  "description": "Facturas generadas a partir de órdenes de venta. Demo sin autorización fiscal de ARCA.",
  "fields": {
    "documentId": "Orden de venta de origen; una orden admite una sola factura.",
    "number": "Número único de factura, proporcionado al crearla.",
    "type": "E: exportación; A: cliente argentino responsable_inscripto o monotributista; B: cliente argentino consumidor_final o exento.",
    "amount": "Importe decimal como string, tomado de la orden de venta.",
    "status": "issued: emitida; paid: pagada; cancelled: cancelada; draft: estado legado, no usado al crear nuevas facturas.",
    "customerName": "Nombre del cliente al momento de emitir; los campos customer guardan sus datos fiscales históricos.",
    "issuedAt": "Fecha asignada por la API al emitir la factura."
  },
  "rules": [
    "POST /invoices recibe solo number y documentId de una orden OV pending.",
    "La API calcula tipo, importe, cliente y usuario; no enviarlos en el cuerpo de creación.",
    "Una venta no exportada a un cliente extranjero se rechaza.",
    "Las facturas se conservan: para anular usar PATCH /invoices/{id} con status cancelled, no DELETE.",
    "PATCH permite status paid o cancelled; una factura cancelada no se modifica.",
    "Cancelar la factura no vuelve a habilitar la orden para facturar.",
    "Los listados son paginados y ambos roles consultan todas las facturas."
  ]
};
