# 00-remediation.md

Fase 7A — Remediación local limitada

Timestamp: 2026-07-14T20:57:45

## Operación 1: actualizar playwright.config.ts

- Fuente canónica: `I:\cajaApp-V3\workspace\frontend\playwright.config.ts`
- Destino operativo: `I:\cajaApp-V3-real\workspace\frontend\playwright.config.ts`
- Existencia previa destino: SÍ
- Hash destino antes: `466B4F72515F9379BFBEE4B97EE7BAAFCA59EE6A1DF59ADEDAAA7DA71FB6524E`
- Bytes iniciales destino antes: `0x69 0x6D 0x70` (sin BOM)
- Operación: copiar desde repo canónico y retirar BOM inicial
- Hash destino después de copia con BOM: `90343109880CD4C1251E5E64428D658F0A6B37CBEA949CE5B11371DDEC970546`
- BOM inicial detectado: SÍ (`0xEF 0xBB 0xBF`)
- Hash destino después de retirar BOM: `552EE82C098EBBBBAF5C443BF92FAD66EBD287F941449876D9772D98F17C001E`
- Configuración requerida verificada:
  - `const FRONTEND_BASE_URL = process.env.CAJAAPP_FRONTEND_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:11437";` — SÍ
  - `baseURL: FRONTEND_BASE_URL` — SÍ

## Operación 2: eliminar residuos conflictivos

- `I:\cajaApp-V3-real\workspace\backend\src\modules\reports\TEMP-CajaAppV3_reports_service_currency_fix_v1.ts` — eliminado (canónico `reports.service.ts` presente)
- `I:\cajaApp-V3-real\workspace\frontend\src\lib\finance\global-search-api (1).ts` — eliminado (canónico `global-search-api.ts` presente)

## Operación 3: limpiar artefactos generados

Directorios eliminados si existían:

- `I:\cajaApp-V3-real\workspace\backend\dist`
- `I:\cajaApp-V3-real\workspace\backend\coverage`
- `I:\cajaApp-V3-real\workspace\frontend\.next`
- `I:\cajaApp-V3-real\workspace\frontend\coverage`
- `I:\cajaApp-V3-real\workspace\frontend\playwright-report`
- `I:\cajaApp-V3-real\workspace\frontend\test-results`

Estado: todos ausentes o limpiados.

## Notas

- Único cambio de código autorizado: `playwright.config.ts` (configuración de URL base).
- No se modificó lógica, tests, migraciones, dependencias ni contratos.
- No se tocó el repo canónico `I:\cajaApp-V3`.
