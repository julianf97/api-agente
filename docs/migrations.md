# Migración de facturación

Esta migración parte de la base existente con `users` e `invoices`. Hacé un backup y detené la API antes de ejecutarla. No ejecutes `bootstrap-db.js`: usa sync y no implementa la transición. La API todavía necesita adaptar rutas, permisos y Swagger antes de volver a usarse.

## Base sin registros

Docker inicializa únicamente la estructura original de `users` e `invoices`, sin usuarios ni facturas de ejemplo. La migración necesita estas tablas para transformarlas a la nueva estructura. Si ya borraste los registros y conservaste las tablas, no hace falta reinicializar el volumen.

Con Docker Desktop iniciado, desde PowerShell:

```powershell
docker compose stop api
docker compose up -d db
npm ci
$env:DB_HOST = "127.0.0.1"
$env:DB_PORT = "5433"
$env:DB_SCHEMA = "api-agente"
$env:DB_USE_TEST_SCHEMA = "false"
Remove-Item Env:MIGRATION_CLIENTS_FILE -ErrorAction SilentlyContinue
npm run db:migrate:status
npm run db:migrate
npm run db:migrate:status
```

No necesitás JSON de clientes cuando no hay facturas anteriores. No ejecutes `docker compose down -v` para esta transición; conserva las tablas existentes. No vuelvas a iniciar la API hasta adaptar los endpoints a los nuevos modelos.

## Clientes históricos

Prepará un JSON local (no lo subas al repositorio) con una entrada por cada `customerName` existente:

```json
[
  {
    "legacyCustomerName": "Nombre exacto del registro anterior",
    "name": "Razón social o nombre real",
    "taxId": "Identificación fiscal real",
    "taxCondition": "responsable_inscripto",
    "country": "AR",
    "address": "Domicilio real"
  }
]
```

Condiciones admitidas: `responsable_inscripto`, `monotributista`, `consumidor_final`, `exento`. Para clientes extranjeros se admite `taxCondition: null`. No se inventan datos fiscales a partir del nombre. Si no hay registros anteriores, no hace falta el archivo.

## PowerShell (base en Docker, runner local)

```powershell
npm ci
$env:DB_HOST = "localhost"
$env:DB_PORT = "5433"
$env:MIGRATION_CLIENTS_FILE = "C:\ruta\clientes-migracion.json"
npm run db:migrate:status
npm run db:migrate
npm run db:migrate:status
```

El resto de las credenciales y DB_SCHEMA se toman de `.env`. El puerto debe coincidir con DB_HOST_PORT. El proceso registra migraciones en `SequelizeMeta` dentro del schema, usa transacciones PostgreSQL y un lock para evitar ejecuciones concurrentes. No se ejecuta automáticamente al arrancar la API.

## Preservación

- Se mantienen IDs, importes, usuarios, fechas y nombres históricos.
- Se mantienen `customerName` y `legacyStatus` en documents para preservar el origen y permitir reversión.
- Los borradores pasan a pending; cancelados a cancelled; emitidos/pagados a invoiced. Estos últimos son históricos y no producen otra factura nueva.
- Todos los documentos históricos se clasifican como OV local (`isExport=false`); revisar esa clasificación antes de habilitar el agente.
- Las cuentas superadmin pasan a admin; sus roles originales se guardan en billing_legacy_roles.
- El archivo puede asociar varios nombres históricos a una misma identificación fiscal y país. Los datos de esas entradas deben ser coherentes.

## Reversión

```powershell
npm run db:migrate:undo
```

Restaura el nombre invoices, los estados históricos y los roles originales. Se bloquea si existen nuevas facturas o documentos sin datos históricos, para impedir perderlos. Los clientes agregados después de la migración también deben reconciliarse antes de revertir.
