# Fixtures sanitizados de recibos de sueldo

Estos PDF son documentos completamente ficticios creados exclusivamente para validar `APP-SALARY-RECEIPT-001`.

No contienen datos de personas ni empresas reales.

| Archivo | Uso | Periodo | Bruto ARS | Descuentos ARS | Neto ARS | SHA-256 |
|---|---|---:|---:|---:|---:|---|
| `salary-receipt.sanitized.base.pdf` | Aceptacion con base futura activada | 06/2026 | 1.400.000,00 | 238.000,00 | 1.162.000,00 | `289391BBE7E358840926EDF459DF204D78415693E7A1528CC892878994EB6CE8` |
| `salary-receipt.sanitized.replacement.pdf` | Reemplazo del mismo empleador, empleado y periodo | 06/2026 | 1.440.000,00 | 244.800,00 | 1.195.200,00 | `F13F46A1B4793A5737F06E3F93FEB438E0B29B6984C470D7D3897B9568CFAFFB` |
| `salary-receipt.sanitized.no-future-base.pdf` | Aceptacion con base futura desactivada | 07/2026 | 1.470.000,00 | 249.900,00 | 1.220.100,00 | `950C768A7F2E48FC94031BABD8ECE348CAB2B12F0284DB97ACAAE21F42D3B8DD` |

## Identidades ficticias comunes

- Empleador: `EMPRESA DEMO S.A.`
- CUIT: `30-00000000-0`
- Empleado: `PERSONA DE PRUEBA`
- CUIL: `20-00000000-0`
- Legajo: `DEMO-001`
- Moneda: `ARS`

## Verificaciones realizadas

- PDF valido y renderizable.
- Una pagina por archivo.
- Texto extraible con `pdfplumber`.
- Contiene multiples indicadores aceptados por `looksLikeSalaryReceipt`.
- Los tres archivos son byte-distintos.
- El archivo de reemplazo conserva las identidades y el periodo del fixture base.
